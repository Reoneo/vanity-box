'use client';

import './Dock.css';

function DockIcon({ children, className = '' }: any) {
  return <div className={`dock-icon ${className}`}>{children}</div>;
}

export default function Dock({
  items,
  className = '',
  baseItemSize = 50
}: any) {
  // Remove all animation-related logic

  return (
    <div className="dock-outer">
      <div
        className={`dock-panel ${className}`}
        role="toolbar"
        aria-label="Application dock"
      >
        {items.map((item: any, index: number) => (
          <div
            key={index}
            onClick={item.onClick}
            className={`dock-item ${item.className || ''} ${item.isActive ? 'dock-item-active' : ''}`}
            style={{ width: baseItemSize, height: baseItemSize }}
            tabIndex={0}
            role="button"
            aria-haspopup="true"
          >
            <DockIcon>{item.icon}</DockIcon>
          </div>
        ))}
      </div>
    </div>
  );
}
