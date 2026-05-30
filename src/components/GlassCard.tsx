import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function GlassCard({ children, className = '', glow = false, onClick, style }: GlassCardProps) {
  return (
    <div 
      className={`glass-card ${glow ? 'panel-glow-indigo' : ''} ${className}`}
      onClick={onClick}
      style={{
        ...(onClick ? { cursor: 'pointer' } : {}),
        ...style
      }}
    >
      {children}
    </div>
  );
}
