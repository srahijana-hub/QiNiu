import React from 'react';

// ============================================================
// FeedbackPanel
// ============================================================

export interface FeedbackPanelProps {
  responseText: string;
  history?: string[];
}

export const FeedbackPanel: React.FC<FeedbackPanelProps> = ({
  responseText,
  history = [],
}) => {
  return (
    <div className="feedback-panel">
      {/* ---- 当前回复 ---- */}
      <div className="feedback-current">
        <div className="feedback-panel__label">助手回复</div>
        {responseText ? (
          <p className="feedback-current__text">{responseText}</p>
        ) : (
          <p className="feedback-current__text feedback-current__text--placeholder">
            说出你的指令开始绘图…
          </p>
        )}
      </div>

      {/* ---- 操作历史 ---- */}
      <div className="feedback-history">
        <div className="feedback-panel__label" style={{ flexShrink: 0, paddingTop: 6 }}>
          历史
        </div>

        {history.length === 0 ? (
          <p className="feedback-history__empty">暂无操作记录</p>
        ) : (
          <ul className="feedback-history__list">
            {history.map((item, i) => (
              <li key={i} className="feedback-history__chip" title={item}>
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

FeedbackPanel.displayName = 'FeedbackPanel';
