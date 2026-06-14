import React, { useState, useEffect, useRef } from 'react';

// ============================================================
// Props
// ============================================================

export interface FeedbackPanelProps {
  responseText: string;
  history?: string[];
}

// ============================================================
// Typewriter
// ============================================================

function useTypewriter(text: string, speed = 28) {
  const [displayed, setDisplayed] = useState('');
  const idx = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    setDisplayed('');
    idx.current = 0;
    if (!text) return;

    timer.current = setInterval(() => {
      idx.current += 1;
      if (idx.current >= text.length) {
        setDisplayed(text);
        if (timer.current) clearInterval(timer.current);
      } else {
        setDisplayed(text.slice(0, idx.current + 1));
      }
    }, speed);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [text, speed]);
  return displayed;
}

// ============================================================
// FeedbackPanel
// ============================================================

export const FeedbackPanel: React.FC<FeedbackPanelProps> = ({
  responseText, history = [],
}) => {
  const displayed = useTypewriter(responseText, 28);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history]);

  const now = () => new Date().toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit', second:'2-digit' });

  return (
    <div className="feedback-panel">
      {/* 扫描线 */}
      <div className="feedback-scanline" aria-hidden="true" />

      {/* AI 回复 */}
      <div className="feedback-current">
        <div className="feedback-prefix">
          <span className="feedback-prefix__dot" />
          <span>ASSISTANT</span>
        </div>
        <p className="feedback-text">
          {displayed || <span className="feedback-text--placeholder">说出指令开始绘图…</span>}
          {displayed && displayed.length < responseText.length && (
            <span className="feedback-cursor">▌</span>
          )}
        </p>
      </div>

      {/* 终端历史 */}
      <div className="feedback-console">
        {history.length === 0 ? (
          <span className="feedback-console__empty">-- 等待指令 --</span>
        ) : (
          history.map((item, i) => (
            <div key={i} className="feedback-console__line"
              style={{ opacity: Math.max(0.1, 1 - i * 0.16) }}>
              <span className="feedback-console__prompt">❯</span>
              <span className="feedback-console__time">[{now()}]</span>
              <span className="feedback-console__msg">{item}</span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
};
FeedbackPanel.displayName = 'FeedbackPanel';
