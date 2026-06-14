import { useState, useRef, useEffect, useCallback } from 'react';
import { SpeechRecognizer } from '../core/speech';

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const recognizerRef = useRef<SpeechRecognizer | null>(null);

  useEffect(() => {
    const recognizer = new SpeechRecognizer();
    recognizerRef.current = recognizer;

    recognizer.onResult((text) => {
      setTranscript(text);
    });

    recognizer.onStateChange((state) => {
      setIsListening(state.isListening);
      setIsProcessing(state.isProcessing);
    });

    recognizer.onError((msg) => {
      setError(msg);
    });
  }, []);

  const start = useCallback(async () => {
    setError('');
    setTranscript('');
    await recognizerRef.current?.start();
  }, []);

  const stop = useCallback(() => {
    recognizerRef.current?.stop();
  }, []);

  return { isListening, transcript, isProcessing, error, start, stop };
}
