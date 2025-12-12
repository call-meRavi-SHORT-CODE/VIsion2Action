import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppRoute } from '../types';
import { speak, announce } from '../services/accessibilityService';

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    announce("Vision to Action. Tap anywhere to start.");
  }, []);

  const handleStart = () => {
    speak("Starting Assistant.");
    navigate(AppRoute.NAVIGATION);
  };

  return (
    <button 
      onClick={handleStart}
      className="flex flex-col h-full w-full bg-slate-900 items-center justify-center p-8 space-y-8 active:bg-slate-800 transition-colors"
      aria-label="Tap anywhere to start vision assistant"
    >
      <div className="relative">
        <div className="absolute -inset-4 bg-blue-500 rounded-full opacity-20 animate-pulse"></div>
        <svg 
          width="120" 
          height="120" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="text-white relative z-10"
        >
          <path d="M2 12h20" />
          <path d="M12 2v20" />
          <circle cx="12" cy="12" r="10" />
        </svg>
      </div>

      <div className="text-center space-y-4">
        <h1 className="text-5xl font-black text-white tracking-tighter">
          VISION<span className="text-blue-500 text-4xl">2</span>ACTION
        </h1>
        <p className="text-2xl text-slate-300 font-medium">
          Tap anywhere to start
        </p>
      </div>

      <div className="absolute bottom-12 text-slate-500 text-sm font-mono">
        High Contrast • Voice Active
      </div>
    </button>
  );
};