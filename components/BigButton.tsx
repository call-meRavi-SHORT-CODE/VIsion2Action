import React from 'react';

interface BigButtonProps {
  onPress: () => void;
  title: string;
  subtitle?: string;
  color?: 'primary' | 'danger' | 'secondary';
  disabled?: boolean;
  fullHeight?: boolean;
}

export const BigButton: React.FC<BigButtonProps> = ({ 
  onPress, 
  title, 
  subtitle, 
  color = 'primary', 
  disabled = false,
  fullHeight = false
}) => {
  
  const getColors = () => {
    if (disabled) return 'bg-slate-700 text-slate-400 border-slate-600';
    switch (color) {
      case 'primary': return 'bg-blue-600 active:bg-blue-700 text-white border-blue-400';
      case 'danger': return 'bg-red-600 active:bg-red-700 text-white border-red-400';
      case 'secondary': return 'bg-slate-800 active:bg-slate-700 text-yellow-400 border-yellow-500';
      default: return 'bg-blue-600 text-white';
    }
  };

  return (
    <button
      onClick={onPress}
      disabled={disabled}
      className={`
        relative w-full rounded-2xl border-b-8 p-6 transition-transform active:translate-y-1 active:border-b-0
        flex flex-col items-center justify-center
        ${getColors()}
        ${fullHeight ? 'h-full' : 'h-auto'}
      `}
      aria-label={`${title} ${subtitle || ''}`}
    >
      <span className="text-3xl font-black uppercase tracking-wider">{title}</span>
      {subtitle && <span className="mt-2 text-lg font-medium opacity-90">{subtitle}</span>}
    </button>
  );
};