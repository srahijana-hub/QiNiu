import { useState, useRef, useEffect, useCallback } from 'react'
import { SpeechRecognizer } from './core/speech'
import { ImageGenerator } from './core/image'

function App() {
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [inputText, setInputText] = useState('')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const recognizerRef = useRef<SpeechRecognizer | null>(null)
  const imageGenRef = useRef<ImageGenerator | null>(null)

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
  }

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const ctx = el.getContext('2d')
    if (!ctx) return
    ctxRef.current = ctx
    imageGenRef.current = new ImageGenerator()
    addLog('画布已初始化')
  }, [])

  const clearCanvas = () => {
    const el = canvasRef.current
    const ctx = ctxRef.current
    if (!el || !ctx) return
    ctx.clearRect(0, 0, el.width, el.height)
    addLog('画布已清空')
  }

  const generateImage = async (prompt: string) => {
    if (!imageGenRef.current || !ctxRef.current || !canvasRef.current) return

    setIsProcessing(true)
    setError('')
    addLog(`生成中: "${prompt}"`)

    try {
      const img = await imageGenRef.current.generateAndLoad(prompt)
      const ctx = ctxRef.current
      const canvas = canvasRef.current

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const scale = Math.min(canvas.width / img.width, canvas.height / img.height)
      const w = img.width * scale
      const h = img.height * scale
      const x = (canvas.width - w) / 2
      const y = (canvas.height - h) / 2

      ctx.drawImage(img, x, y, w, h)
      addLog(`生成完成 (${img.width}x${img.height})`)
    } catch (err) {
      const msg = `生成失败: ${err instanceof Error ? err.message : err}`
      setError(msg)
      addLog(msg)
    } finally {
      setIsProcessing(false)
    }
  }

  const submitText = () => {
    const text = inputText.trim()
    if (!text) return
    setTranscript(text)
    addLog(`输入: "${text}"`)
    setInputText('')
    generateImage(text)
  }

  const startRecording = async () => {
    const recognizer = new SpeechRecognizer()
    recognizerRef.current = recognizer

    recognizer.onResult((text) => {
      setTranscript(text)
      addLog(`识别结果: "${text}"`)
      generateImage(text)
    })

    recognizer.onStateChange((state) => {
      setIsListening(state.isListening)
      setIsProcessing(state.isProcessing)
    })

    recognizer.onError((msg) => {
      setError(msg)
      addLog(`错误: ${msg}`)
    })

    addLog('开始录音...')
    await recognizer.start()
    addLog('录音中，请说话...')
  }

  const stopRecording = () => {
    addLog('停止录音...')
    recognizerRef.current?.stop()
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      {/* 左侧：画布 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        <h2 style={{ marginBottom: 12 }}>AI 语音绘图</h2>
        <div style={{ marginBottom: 8 }}>
          <button onClick={clearCanvas} style={{ fontSize: 13, padding: '6px 16px', background: '#ff9800', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            清空画布
          </button>
        </div>
        <canvas
          ref={canvasRef}
          width={800}
          height={800}
          style={{ background: '#fff', border: '2px solid #333', borderRadius: 4 }}
        />
      </div>

      {/* 右侧：控制面板 */}
      <div style={{ width: 360, padding: 20, background: '#fafafa', borderLeft: '1px solid #ddd', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ marginBottom: 16 }}>控制面板</h3>

        <div style={{ marginBottom: 16 }}>
          {!isListening && !isProcessing ? (
            <button onClick={startRecording} style={{ fontSize: 16, padding: '10px 24px', width: '100%' }}>
              点击开始录音
            </button>
          ) : (
            <button
              onClick={stopRecording}
              disabled={!isListening}
              style={{ fontSize: 16, padding: '10px 24px', width: '100%', background: '#f44336', color: '#fff', border: 'none', borderRadius: 4 }}
            >
              {isProcessing ? '生成中...' : '停止录音'}
            </button>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>文字输入</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitText()}
              placeholder="描述你想画的内容..."
              disabled={isProcessing}
              style={{ flex: 1, padding: '8px 12px', fontSize: 14, border: '1px solid #ccc', borderRadius: 4 }}
            />
            <button
              onClick={submitText}
              disabled={isProcessing || !inputText.trim()}
              style={{ padding: '8px 16px', fontSize: 14, background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            >
              生成
            </button>
          </div>
        </div>

        {error && <div style={{ color: 'red', marginBottom: 12, fontSize: 14 }}>{error}</div>}

        {transcript && (
          <div style={{ background: '#e3f2fd', padding: 12, borderRadius: 6, marginBottom: 12 }}>
            <strong>输入：</strong>{transcript}
          </div>
        )}

        <div style={{ flex: 1, background: '#111', color: '#0f0', padding: 12, borderRadius: 6, fontFamily: 'monospace', fontSize: 12, overflow: 'auto' }}>
          {logs.length === 0 ? '等待操作...' : logs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
    </div>
  )
}

export default App
