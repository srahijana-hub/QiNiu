const ASR_API_URL = import.meta.env.VITE_LLM_API_URL ?? '';
const ASR_API_KEY = import.meta.env.VITE_LLM_API_KEY ?? '';
const ASR_MODEL = import.meta.env.VITE_ASR_MODEL ?? 'mimo-v2.5-asr';

export class SpeechRecognizer {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private isListening = false;
  private onResultCallback: ((transcript: string, isFinal: boolean) => void) | null = null;
  private onStateChangeCallback: ((state: { isListening: boolean; isProcessing: boolean }) => void) | null = null;
  private onErrorCallback: ((message: string) => void) | null = null;

  async start(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.chunks = [];
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };

      this.mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        this.isListening = false;
        this.emitState({ isListening: false, isProcessing: true });

        try {
          const blob = new Blob(this.chunks, { type: 'audio/webm' });
          const text = await this.recognize(blob);
          if (text) {
            this.onResultCallback?.(text, true);
          } else {
            this.onErrorCallback?.('未识别到语音内容');
          }
        } catch (err) {
          this.onErrorCallback?.(`语音识别失败: ${err instanceof Error ? err.message : err}`);
        } finally {
          this.emitState({ isListening: false, isProcessing: false });
        }
      };

      this.mediaRecorder.start();
      this.isListening = true;
      this.emitState({ isListening: true, isProcessing: false });
    } catch (err) {
      this.onErrorCallback?.(`麦克风访问失败: ${err instanceof Error ? err.message : err}`);
    }
  }

  stop(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
  }

  onResult(callback: (transcript: string, isFinal: boolean) => void): void {
    this.onResultCallback = callback;
  }

  onStateChange(callback: (state: { isListening: boolean; isProcessing: boolean }) => void): void {
    this.onStateChangeCallback = callback;
  }

  onError(callback: (message: string) => void): void {
    this.onErrorCallback = callback;
  }

  private async recognize(blob: Blob): Promise<string> {
    const wavBlob = await this.convertToWav(blob);
    const base64 = await this.blobToBase64(wavBlob);
    const dataUrl = `data:audio/wav;base64,${base64}`;

    const res = await fetch(ASR_API_URL, {
      method: 'POST',
      headers: {
        'api-key': ASR_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ASR_MODEL,
        messages: [{
          role: 'user',
          content: [{
            type: 'input_audio',
            input_audio: { data: dataUrl },
          }],
        }],
        asr_options: { language: 'zh' },
      }),
    });

    if (!res.ok) throw new Error(`ASR API error: ${res.status}`);

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async convertToWav(blob: Blob): Promise<Blob> {
    const audioCtx = new AudioContext();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const dataSize = length * numChannels * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    const channels: Float32Array[] = [];
    for (let ch = 0; ch < numChannels; ch++) channels.push(audioBuffer.getChannelData(ch));

    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    await audioCtx.close();
    return new Blob([buffer], { type: 'audio/wav' });
  }

  private emitState(state: { isListening: boolean; isProcessing: boolean }): void {
    this.onStateChangeCallback?.(state);
  }
}
