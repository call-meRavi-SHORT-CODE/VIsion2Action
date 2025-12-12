import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppRoute } from '../types';
import { BigButton } from '../components/BigButton';
import { Eye, Video } from 'lucide-react';
import { speak } from '../services/accessibilityService';

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();

  const handleNav = (route: AppRoute, message: string) => {
    speak(message);
    navigate(route);
  };

  return (
    <div className="flex flex-col h-full max-w-md mx-auto p-6 justify-center space-y-8">
      
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-5xl font-black text-white tracking-tighter">
          <span className="text-blue-500">Vision</span>2Action
        </h1>
        <p className="text-slate-400 text-xl">AI Visual Assistant</p>
      </div>

      <div className="space-y-6 w-full">
        <BigButton 
          title="Single Scan" 
          subtitle="Describe scene once"
          color="primary"
          onPress={() => handleNav(AppRoute.SCAN, "Opening Single Scan mode.")}
        />

        <BigButton 
          title="Continuous" 
          subtitle="Real-time navigation"
          color="secondary"
          onPress={() => handleNav(AppRoute.CONTINUOUS, "Opening Continuous Navigation mode.")}
        />
      </div>

      <div className="mt-auto pt-8">
        <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
          <p className="text-slate-300 text-center text-sm">
            <span className="block font-bold text-yellow-500 mb-1">ACCESSIBILITY MODE ON</span>
            High contrast • Voice Feedback • Large Controls
          </p>
        </div>
      </div>
    </div>
  );
};