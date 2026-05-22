/**
 * useVoiceController — Web Speech API Hook
 * HCI: Voice input for hands-free cooking (Nielsen #7 — Flexibility).
 * Error Recovery (Nielsen #9): Unrecognized commands show friendly toasts.
 *
 * TTS ↔ Recognition Coordination:
 *   To prevent the microphone from picking up the browser's own text-to-speech (TTS)
 *   voice and triggering unwanted commands (self-triggering), we keep a simple
 *   speaking state. While the assistant is actively speaking a step description,
 *   voice commands are ignored (except "stop" / "pause").
 *   This avoids constantly starting/stopping the SpeechRecognition engine,
 *   which is slow, error-prone, and causes browser-specific lag or beep noises.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAccessibilityStore } from '../stores/accessibilityStore';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

interface VoiceHandlers {
  onNext: () => void;
  onBack: () => void;
  onRepeat: () => void;
  onStartTimer: () => void;
  onStopTimer: () => void;
  onGoToStep: (stepIndex: number) => void;
  onGoHome: () => void;
  onSearch: (query: string) => void;
  onOpenShopping: () => void;
}

export function useVoiceController(handlers: VoiceHandlers) {
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const isListeningRef = useRef(false);
  const handlersRef = useRef(handlers);
  
  // Track active speech synthesis speaking state to prevent self-triggering
  const isSpeakingRef = useRef(false);
  const processCommandRef = useRef<(transcript: string) => void>(() => {});

  // Update handlers ref on every render to avoid stale closures
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const { isListening, setIsListening, setLastCommand, showToast, voiceEnabled } =
    useAccessibilityStore(useShallow((state) => ({
      isListening: state.isListening,
      setIsListening: state.setIsListening,
      setLastCommand: state.setLastCommand,
      showToast: state.showToast,
      voiceEnabled: state.voiceEnabled,
    })));

  const lastTranscriptRef = useRef('');
  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // ── Command processor ──
  const processCommand = useCallback(
    (transcript: string) => {
      const cmd = transcript.toLowerCase().trim();
      if (!cmd) return;

      // ── Timer Controls (specific first, then generic) ──
      if (cmd.includes('start timer') || cmd.includes('set timer')) {
        handlersRef.current.onStartTimer?.();
        showToast('✓ Timer started!', 'success');
        return;
      }
      if (cmd.includes('stop timer') || cmd.includes('pause timer')) {
        handlersRef.current.onStopTimer?.();
        showToast('✓ Timer stopped', 'info');
        return;
      }
      if (cmd.includes('timer')) {
        handlersRef.current.onStartTimer?.();
        showToast('✓ Timer started!', 'success');
        return;
      }

      // Handle interrupt/stop commands even if the assistant is currently speaking
      if (cmd.includes('stop') || cmd.includes('pause') || cmd.includes('cancel')) {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        isSpeakingRef.current = false;
        stopListening();
        showToast('🎤 Voice paused', 'info');
        return;
      }

      // If the assistant is currently speaking, ignore incoming transcripts to prevent self-triggering
      if (isSpeakingRef.current || (typeof window !== 'undefined' && window.speechSynthesis?.speaking)) {
        return;
      }

      // Cancel any ongoing TTS just in case
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      lastTranscriptRef.current = cmd;
      setLastCommand(cmd);

      // ── Step Navigation ──
      if (cmd.includes('next') || cmd.includes('forward') || cmd.includes('continue')) {
        handlersRef.current.onNext();
        showToast('✓ Next step', 'success');
        return;
      }
      if (cmd.includes('back') || cmd.includes('previous')) {
        handlersRef.current.onBack();
        showToast('✓ Previous step', 'success');
        return;
      }
      if (cmd.includes('repeat') || cmd.includes('again') || cmd.includes('read')) {
        handlersRef.current.onRepeat();
        showToast('✓ Repeating step', 'success');
        return;
      }

      // Jump to step (e.g., "Go to step 3" or "Step 3")
      const stepMatch = cmd.match(/(?:go to )?step (\d+)/);
      if (stepMatch) {
        const stepNum = parseInt(stepMatch[1], 10);
        handlersRef.current.onGoToStep?.(stepNum - 1);
        showToast(`✓ Moving to step ${stepNum}`, 'success');
        return;
      }

      if (cmd.includes('home') || cmd.includes('show recipes') || cmd.includes('library')) {
        handlersRef.current.onGoHome?.();
        showToast('✓ Returning home', 'info');
        return;
      }
      if (cmd.includes('show list') || cmd.includes('shopping list') || cmd.includes('open list')) {
        handlersRef.current.onOpenShopping?.();
        showToast('✓ Opening shopping list', 'info');
        return;
      }

      // Conversational Search (e.g., "What can I cook with chicken?")
      const searchMatch = cmd.match(/(?:cook with|recipes with|search for) (.*)/);
      if (searchMatch) {
        const query = searchMatch[1].trim();
        handlersRef.current.onSearch?.(query);
        return;
      }

      if (cmd.includes('help') || cmd.includes('what can i say')) {
        showToast('Try: "Next", "Back", "Cook with chicken", or "Go Home"', 'info');
        return;
      }

      showToast(`🤔 Heard: "${cmd}". Try "Help" for commands.`, 'error');
    },
    [setLastCommand, showToast, setIsListening]
  );

  // Keep the processCommand ref in sync
  useEffect(() => {
    processCommandRef.current = processCommand;
  }, [processCommand]);

  // ── Helper: create and wire up a fresh SpeechRecognition instance ──
  const createRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    r.continuous = true;
    r.interimResults = false;
    r.lang = 'en-US';
    r.onstart = () => {
      isListeningRef.current = true;
      setIsListening(true);
    };
    r.onresult = (e: SpeechRecognitionEvent) => {
      const last = e.results[e.results.length - 1];
      if (last.isFinal) {
        processCommandRef.current(last[0].transcript);
      }
    };
    r.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (
        e.error === 'no-speech' ||
        e.error === 'aborted' ||
        e.error === 'not-allowed' ||
        e.error === 'audio-capture' ||
        e.error === 'network'
      ) return;
      showToast(`Mic error: ${e.error}`, 'error');
    };
    r.onend = () => {
      // Auto-restart if we're supposed to be listening
      if (isListeningRef.current) {
        try { r.start(); } catch { /* will retry on next toggle */ }
      } else {
        setIsListening(false);
      }
    };
    return r;
  }, [setIsListening, showToast]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      showToast('Voice not supported in this browser.', 'error');
      return;
    }
    // Tear down any previous instance
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ok */ }
    }
    const r = createRecognition();
    recognitionRef.current = r;
    
    // Set listening state immediately for responsive visual feedback
    isListeningRef.current = true;
    setIsListening(true);
    
    try {
      r.start();
    } catch {
      isListeningRef.current = false;
      setIsListening(false);
      showToast('Could not start voice.', 'error');
    }
  }, [isSupported, createRecognition, showToast, setIsListening]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ok */ }
      recognitionRef.current = null;
    }
  }, [setIsListening]);

  const toggleListening = useCallback(() => {
    // Cancel any ongoing TTS so the mic can hear the user clearly
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    isListening ? stopListening() : startListening();
  }, [isListening, startListening, stopListening]);

  // ── speakAndResume: Coordinated TTS speaking helper ──
  // Keeps track of speaking state to gate command recognition during TTS playback.
  const speakAndResume = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;

    const shouldResumeListening = isListeningRef.current;
    window.speechSynthesis.cancel();
    isSpeakingRef.current = true;

    if (shouldResumeListening) {
      stopListening();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;

    utterance.onend = () => {
      isSpeakingRef.current = false;
      if (shouldResumeListening) {
        startListening();
      }
    };

    utterance.onerror = () => {
      isSpeakingRef.current = false;
      if (shouldResumeListening) {
        startListening();
      }
    };

    window.speechSynthesis.speak(utterance);
  }, [startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ok */ }
    }
  }, []);

  // Auto-start/stop based on voiceEnabled setting
  useEffect(() => {
    if (voiceEnabled && !isListening) startListening();
    else if (!voiceEnabled && isListening) stopListening();
  }, [voiceEnabled]);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    speakAndResume,
    lastTranscript: lastTranscriptRef.current,
    recognitionInstance: recognitionRef.current,
  };
}
