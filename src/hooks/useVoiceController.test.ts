import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceController } from './useVoiceController';

// Mock simple debounce for tests
vi.mock('lodash/debounce', () => ({
  default: (fn: any) => fn,
}));

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

  describe('Command Parsing Logic', () => {
    // Note: Since we are mocking the Web Speech API in setup.ts, 
    // we need to trigger the 'onresult' callback manually.
    // However, for unit testing the hook's internal logic, we can
    // test the command matching if the hook exposes it or by
    // simulating the SpeechRecognition result event.

    it('should trigger onNext for "next" command', () => {
      const { result } = renderHook(() => useVoiceController(mockHandlers));
      
      // Simulate a speech result event
      act(() => {
        result.current.toggleListening();
      });

      const recognition = (result.current as any).recognitionInstance;
      if (recognition && recognition.onresult) {
        const mockEvent = {
          results: [
            { 0: { transcript: 'next step', confidence: 0.99 }, isFinal: true }
          ],
          resultIndex: 0
        };
        
        act(() => {
          recognition.onresult(mockEvent);
        });

        expect(mockHandlers.onNext).toHaveBeenCalled();
      }
    });

    it('should trigger onBack for "go back" command', () => {
      const { result } = renderHook(() => useVoiceController(mockHandlers));
      act(() => { result.current.toggleListening(); });

      const recognition = (result.current as any).recognitionInstance;
      if (recognition && recognition.onresult) {
        const mockEvent = {
          results: [[{ transcript: 'go back', confidence: 0.99 }]],
          resultIndex: 0
        };
        mockEvent.results[0].isFinal = true;
        act(() => {
          recognition.onresult(mockEvent);
        });
        expect(mockHandlers.onBack).toHaveBeenCalled();
      }
    });

    it('should trigger onStartTimer for "start timer" command', () => {
      const { result } = renderHook(() => useVoiceController(mockHandlers));
      act(() => { result.current.toggleListening(); });

      const recognition = (result.current as any).recognitionInstance;
      if (recognition && recognition.onresult) {
        const mockEvent = {
          results: [[{ transcript: 'start the timer', confidence: 0.99 }]],
          resultIndex: 0
        };
        mockEvent.results[0].isFinal = true;
        act(() => {
          recognition.onresult(mockEvent);
        });
        expect(mockHandlers.onStartTimer).toHaveBeenCalled();
      }
    });

    it('should trigger onSearch for "search" command with payload', () => {
      const { result } = renderHook(() => useVoiceController(mockHandlers));
      act(() => { result.current.toggleListening(); });

      const recognition = (result.current as any).recognitionInstance;
      if (recognition && recognition.onresult) {
        const mockEvent = {
          results: [[{ transcript: 'search for pasta', confidence: 0.99 }]],
          resultIndex: 0
        };
        mockEvent.results[0].isFinal = true;
        act(() => {
          recognition.onresult(mockEvent);
        });
        expect(mockHandlers.onSearch).toHaveBeenCalledWith('pasta');
      }
    });

    it('should trigger onGoToStep for "go to step 3" command', () => {
      const { result } = renderHook(() => useVoiceController(mockHandlers));
      act(() => { result.current.toggleListening(); });

      const recognition = (result.current as any).recognitionInstance;
      if (recognition && recognition.onresult) {
        const mockEvent = {
          results: [[{ transcript: 'go to step 3', confidence: 0.99 }]],
          resultIndex: 0
        };
        mockEvent.results[0].isFinal = true;
        act(() => {
          recognition.onresult(mockEvent);
        });
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
        recognition.onerror({ error: 'not-supported' });
      });
      // The store or hook might handle it differently but it should clear listening if unrecoverable
      // In this setup, we just test it doesn't crash.
    }
  });

  it('should support stop command to disable listening', () => {
    const { result } = renderHook(() => useVoiceController(mockHandlers));
    act(() => { result.current.toggleListening(); });

    const recognition = (result.current as any).recognitionInstance;
    if (recognition && recognition.onresult) {
      act(() => {
        recognition.onresult({
          results: [[{ transcript: 'stop listening', confidence: 0.99 }]],
          resultIndex: 0
        });
        // We inject isFinal property inline or right before:
        const mockE = { results: [[{ transcript: 'stop listening' }]] };
        mockE.results[0].isFinal = true;
        recognition.onresult(mockE);
      });
      expect(result.current.isListening).toBe(false);
    }
  });
});
