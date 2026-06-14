import React from 'react';

/**
 * Infinity Dot Grid — 深空背景网格点阵
 *
 * 纯 CSS 实现，若隐若现的点阵给画布增添 "AI 终端" 质感。
 * 放入 App 顶层，z-index 0，不拦截点击。
 */
export const BackgroundDots: React.FC = () => {
  return <div className="dot-grid" aria-hidden="true" />;
};

BackgroundDots.displayName = 'BackgroundDots';
