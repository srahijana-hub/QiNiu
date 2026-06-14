const API_URL = '/dashscope-api/services/aigc/multimodal-generation/generation';
const API_KEY = import.meta.env.VITE_DASHSCOPE_API_KEY ?? '';
const MODEL = 'qwen-image-2.0';

export class ImageGenerator {
  async generate(prompt: string): Promise<string> {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        input: {
          messages: [{
            role: 'user',
            content: [{ text: prompt }],
          }],
        },
        parameters: {
          negative_prompt: '低分辨率，低画质，肢体畸形，画面过饱和，画面具有AI感',
          prompt_extend: true,
          watermark: false,
          size: '1024*1024',
        },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Image API error: ${res.status} ${errBody.slice(0, 200)}`);
    }

    const data = await res.json();
    const imageUrl = data.output?.choices?.[0]?.message?.content?.[0]?.image;

    if (!imageUrl) {
      throw new Error('No image URL in response');
    }

    return imageUrl;
  }

  async generateAndLoad(prompt: string): Promise<HTMLImageElement> {
    const url = await this.generate(prompt);
    return this.loadImage(url);
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  }
}
