// ============================================================
// SpeechSynthesizer — 浏览器原生 TTS 语音合成
// ============================================================

export class SpeechSynthesizer {
  private synth: SpeechSynthesis;

  constructor() {
    this.synth = window.speechSynthesis;
  }

  /** 朗读文字（中文，女声） */
  speak(text: string): void {
    if (!text || !this.synth) return;

    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // 尝试选中文女声
    const voices = this.synth.getVoices();
    const zhVoice =
      voices.find((v) => v.lang.startsWith('zh') && v.name.includes('Female')) ??
      voices.find((v) => v.lang.startsWith('zh-CN')) ??
      voices[0];
    if (zhVoice) utterance.voice = zhVoice;

    this.synth.speak(utterance);
  }
}
