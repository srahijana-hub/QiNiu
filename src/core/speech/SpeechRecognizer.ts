export class SpeechRecognizer {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private onResultCallback: ((transcript: string, isFinal: boolean) => void) | null = null;
  private onStateChangeCallback: ((state: { isListening: boolean; isProcessing: boolean }) => void) | null = null;

  constructor() {
    const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      console.warn('当前浏览器不支持 SpeechRecognition API');
      return;
    }

    this.recognition = new SpeechRecognitionCtor();
    this.recognition.lang = 'zh-CN';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      const isFinal = result.isFinal;
      this.onResultCallback?.(transcript, isFinal);
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        this.recognition?.start();
      } else {
        this.emitState();
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech') return;
      if (event.error === 'not-allowed') {
        console.warn('麦克风授权被拒绝，请在浏览器设置中允许麦克风访问');
      }
      this.isListening = false;
      this.emitState();
    };
  }

  start(): void {
    if (!this.recognition) return;
    if (this.isListening) return;
    this.isListening = true;
    this.recognition.start();
    this.emitState();
  }

  stop(): void {
    if (!this.recognition) return;
    this.isListening = false;
    this.recognition.stop();
    this.emitState();
  }

  onResult(callback: (transcript: string, isFinal: boolean) => void): void {
    this.onResultCallback = callback;
  }

  onStateChange(callback: (state: { isListening: boolean; isProcessing: boolean }) => void): void {
    this.onStateChangeCallback = callback;
  }

  private emitState(): void {
    this.onStateChangeCallback?.({ isListening: this.isListening, isProcessing: false });
  }
}
