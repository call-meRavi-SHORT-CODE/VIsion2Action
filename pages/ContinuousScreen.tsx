import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CameraView } from '../components/CameraView';
import { BigButton } from '../components/BigButton';
import { CameraHandle, AppRoute } from '../types';
import { analyzeImage } from '../services/geminiService';
import { speak, vibrate } from '../services/accessibilityService';
import { ArrowLeft } from 'lucide-react';

export const ContinuousScreen: React.FC = () => {
  const navigate = useNavigate();
  const cameraRef = useRef<CameraHandle>(null);
  const [isActive, setIsActive] = useState(false);
  const [statusText, setStatusText] = useState("Paused");
  const isProcessingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const processFrame = useCallback(async () => {
    // Prevent overlapping requests
    if (isProcessingRef.current || !isActive) return;

    isProcessingRef.current = true;
    
    try {
      const imageBase64 = cameraRef.current?.captureFrame();
      if (imageBase64) {
        const description = await analyzeImage(imageBase64);
        
        // Only update if we got a meaningful response
        if (description && description.length > 2) {
            setStatusText(description);
            speak(description);
            // Gentle haptic tap to confirm "I saw something and I'm telling you"
            vibrate(50);
        }
      }
    } catch (e) {
      console.error("Frame processing error", e);
    } finally {
      isProcessingRef.current = false;
    }
  }, [isActive]);

  const toggleSession = () => {
    if (isActive) {
      setIsActive(false);
      setStatusText("Paused");
      speak("Navigation paused.");
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      setIsActive(true);
      setStatusText("Starting navigation...");
      speak("Starting continuous navigation. Hold camera steady.");
    }
  };

  // Manage the interval loop
  useEffect(() => {
    if (isActive) {
      // Run every 3.5 seconds to balance API rate limits and usability
      intervalRef.current = setInterval(processFrame, 3500);
      // Run immediately once
      processFrame();
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, processFrame]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-900 p-4 gap-4">
      <div className="flex items-center justify-between py-2">
        <button 
          onClick={() => navigate(AppRoute.HOME)}
          className="p-4 bg-slate-800 rounded-full text-white hover:bg-slate-700"
          aria-label="Go Back"
        >
          <ArrowLeft size={32} />
        </button>
        <h1 className="text-2xl font-bold text-white">Continuous</h1>
        <div className="w-16" />
      </div>

      <div className={`flex-1 rounded-2xl overflow-hidden border-4 relative transition-colors duration-300 ${isActive ? 'border-green-500' : 'border-slate-700'}`}>
        <CameraView ref={cameraRef} />
        
        {/* Status Overlay - High Contrast for Low Vision */}
        <div className="absolute top-4 left-4 right-4">
          <div className="bg-slate-900/90 p-4 rounded-xl border-2 border-yellow-400 shadow-lg">
            <p className="text-yellow-400 font-bold text-xl text-center leading-snug">
              {statusText}
            </p>
          </div>
        </div>
      </div>

      <div className="h-32">
        <BigButton 
          title={isActive ? "STOP" : "START"} 
          subtitle={isActive ? "Pause Navigation" : "Begin Real-time Aid"}
          onPress={toggleSession} 
          color={isActive ? "danger" : "primary"}
          fullHeight
        />
      </div>
    </div>
  );
};