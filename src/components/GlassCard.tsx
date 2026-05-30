import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, className = '', glow = false, onClick }: GlassCardProps) {
  return (
    <div 
      className={`glass-card ${glow ? 'panel-glow-indigo' : ''} ${className}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {children}
    </div>
  );
}
