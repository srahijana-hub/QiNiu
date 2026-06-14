import { useState, useRef, useCallback } from 'react';
import type { CanvasState } from '../types/canvas';
import type { LLMResponse } from '../types/llm';
import { useSpeechRecognition } from './useSpeechRecognition';
import { LLMService } from '../core/llm';

export function useVoiceCommands() {
  const {
    isListening,
    transcript,
    isProcessing: isRecognizing,
    error: speechError,
    start: startListening,
    stop: stopListening,
  } = useSpeechRecognition();

  const [isProcessing, setIsProcessing] = useState(false);
  const llmServiceRef = useRef(
    new LLMService(
      import.meta.env.VITE_LLM_API_KEY ?? '',
      import.meta.env.VITE_LLM_API_URL ?? '',
      import.meta.env.VITE_LLM_MODEL ?? '',
    ),
  );

  const processTranscript = useCallback(
    async (text: string, canvasState: CanvasState): Promise<LLMResponse> => {
      setIsProcessing(true);
      try {
        return await llmServiceRef.current.parseCommand(text, canvasState);
      } finally {
        setIsProcessing(false);
      }
    },
    [],
  );

  return {
    isListening,
    isProcessing: isProcessing || isRecognizing,
    transcript,
    speechError,
    startListening,
    stopListening,
    processTranscript,
  };
}
