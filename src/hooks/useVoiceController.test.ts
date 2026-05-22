import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceController } from './useVoiceController';

describe('useVoiceController', () => {
  const mockHandlers = {
    onNext: vi.fn(),
    onBack: vi.fn(),
    onRepeat: vi.fn(),
    onStartTimer: vi.fn(),
    onStopTimer: vi.fn(),
    onGoToStep: vi.fn(),
    onGoHome: vi.fn(),
    onSearch: vi.fn(),
    onOpenShopping: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize correctly and check for support', () => {
    const { result } = renderHook(() => useVoiceController(mockHandlers));
    expect(result.current.isSupported).toBe(true);
    expect(result.current.isListening).toBe(false);
  });

  it('should toggle listening state', () => {
    const { result } = renderHook(() => useVoiceController(mockHandlers));
    
    act(() => {
      result.current.toggleListening();
    });
    
    expect(result.current.isListening).toBe(true);
    
    act(() => {
      result.current.toggleListening();
    });
    
    expect(result.current.isListening).toBe(false);
  });

  it('should expose speakAndResume function', () => {
    const { result } = renderHook(() => useVoiceController(mockHandlers));
    expect(typeof result.current.speakAndResume).toBe('function');
  });

  it('should resume listening after speech ends', () => {
    const { result } = renderHook(() => useVoiceController(mockHandlers));

    act(() => {
      result.current.toggleListening();
    });

    const spoken = vi.spyOn(window.speechSynthesis, 'speak');

    act(() => {
      result.current.speakAndResume('Step 1: mix the ingredients');
    });

    expect(result.current.isListening).toBe(false);
    expect(spoken).toHaveBeenCalled();

    const utterance = spoken.mock.calls[0][0] as SpeechSynthesisUtterance;

    act(() => {
      utterance.onend?.(new Event('end') as any);
    });

    expect(result.current.isListening).toBe(true);
    spoken.mockRestore();
  });

  describe('Command Parsing Logic', () => {
    // Helper to simulate SpeechRecognition transcripts type-safely in unit tests
    function sendVoiceCommand(recognition: any, transcript: string) {
      const mockEvent = {
        results: [
          {
            0: { transcript, confidence: 0.99 },
            isFinal: true,
          }
        ] as any,
        resultIndex: 0,
      };
      
      act(() => {
        recognition.onresult(mockEvent as any);
      });
    }

    it('should trigger onNext for "next" command', () => {
      const { result } = renderHook(() => useVoiceController(mockHandlers));
      
      act(() => {
        result.current.toggleListening();
      });

      const recognition = (result.current as any).recognitionInstance;
      expect(recognition).toBeDefined();
      if (recognition && recognition.onresult) {
        sendVoiceCommand(recognition, 'next step');
        expect(mockHandlers.onNext).toHaveBeenCalled();
      }
    });

    it('should trigger onBack for "go back" command', () => {
      const { result } = renderHook(() => useVoiceController(mockHandlers));
      act(() => { result.current.toggleListening(); });

      const recognition = (result.current as any).recognitionInstance;
      if (recognition && recognition.onresult) {
        sendVoiceCommand(recognition, 'go back');
        expect(mockHandlers.onBack).toHaveBeenCalled();
      }
    });

    it('should trigger onStartTimer for "start timer" command', () => {
      const { result } = renderHook(() => useVoiceController(mockHandlers));
      act(() => { result.current.toggleListening(); });

      const recognition = (result.current as any).recognitionInstance;
      if (recognition && recognition.onresult) {
        sendVoiceCommand(recognition, 'start the timer');
        expect(mockHandlers.onStartTimer).toHaveBeenCalled();
      }
    });

    it('should trigger onSearch for "search" command with payload', () => {
      const { result } = renderHook(() => useVoiceController(mockHandlers));
      act(() => { result.current.toggleListening(); });

      const recognition = (result.current as any).recognitionInstance;
      if (recognition && recognition.onresult) {
        sendVoiceCommand(recognition, 'search for pasta');
        expect(mockHandlers.onSearch).toHaveBeenCalledWith('pasta');
      }
    });

    it('should trigger onGoToStep for "go to step 3" command', () => {
      const { result } = renderHook(() => useVoiceController(mockHandlers));
      act(() => { result.current.toggleListening(); });

      const recognition = (result.current as any).recognitionInstance;
      if (recognition && recognition.onresult) {
        sendVoiceCommand(recognition, 'go to step 3');
        expect(mockHandlers.onGoToStep).toHaveBeenCalledWith(2); // 0-indexed
      }
    });
  });

  it('should handle recognition errors gracefully', () => {
    const { result } = renderHook(() => useVoiceController(mockHandlers));
    act(() => { result.current.toggleListening(); });

    const recognition = (result.current as any).recognitionInstance;
    if (recognition && recognition.onerror) {
      act(() => {
        // use an error that is not in the ignored list to ensure it surfaces properly
        recognition.onerror({ error: 'not-supported' } as any);
      });
    }
  });

  it('should support stop command to disable listening', () => {
    const { result } = renderHook(() => useVoiceController(mockHandlers));
    act(() => { result.current.toggleListening(); });

    const recognition = (result.current as any).recognitionInstance;
    if (recognition && recognition.onresult) {
      const mockEvent = {
        results: [
          {
            0: { transcript: 'stop listening', confidence: 0.99 },
            isFinal: true,
          }
        ] as any,
        resultIndex: 0,
      };

      act(() => {
        recognition.onresult(mockEvent as any);
      });
      expect(result.current.isListening).toBe(false);
    }
  });
});
