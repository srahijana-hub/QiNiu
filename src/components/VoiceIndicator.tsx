import React from 'react';

// ============================================================
// VoiceIndicator
// ============================================================

export interface VoiceIndicatorProps {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
}

const STATUS = {
  idle:    { label: '待命中',    dotClass: 'voice-dot--idle',       labelClass: '' },
  listening: { label: '正在听…',  dotClass: 'voice-dot--listening',  labelClass: 'voice-label--listening' },
  processing:{ label: '处理中…', dotClass: 'voice-dot--processing', labelClass: 'voice-label--processing' },
} as const;

export const VoiceIndicator: React.FC<VoiceIndicatorProps> = ({
  isListening,
  isProcessing,
  transcript,
}) => {
  const statusKey  = isProcessing ? 'processing' : isListening ? 'listening' : 'idle';
  const { label, dotClass, labelClass } = STATUS[statusKey];

  return (
    <div className="voice-indicator">
      <span className={`voice-dot ${dotClass}`} aria-hidden="true" />
      <span className={`voice-label ${labelClass}`}>{label}</span>
      {transcript && (
        <span className="voice-transcript">“{transcript}”</span>
      )}
    </div>
  );
};

VoiceIndicator.displayName = 'VoiceIndicator';
