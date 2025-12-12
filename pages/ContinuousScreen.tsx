import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CameraView } from '../components/CameraView';
import { CameraHandle, AppRoute } from '../types';
import { analyzeImage, askAboutImage } from '../services/geminiService';
import { speak, vibrate, playEarcon } from '../services/accessibilityService';
import { Mic, StopCircle, Navigation, Loader2 } from 'lucide-react';

export const ContinuousScreen: React.FC = () => {
  const navigate = useNavigate();
  const cameraRef = useRef<CameraHandle>(null);
  
  // States
  const [isActive, setIsActive] = useState(true); // Auto-start on mount
  const [status, setStatus] = useState<string>("Initializing...");
  const [isListening, setIsListening] = useState(false);
  const [lastImage, setLastImage] = useState<string | null>(null);

  // Refs for loop management
  const isLoopRunning = useRef(true);
  const recognitionRef = useRef<any>(null);
  const processingRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Voice Recognition Setup ---
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (recognitionRef.current) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true; 
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      // Auto-restart if we are still active
      if (isLoopRunning.current) {
         startListening();
      }
    };

    recognition.onresult = async (event: any) => {
      const lastIndex = event.results.length - 1;
      const transcript = event.results[lastIndex][0].transcript.trim();
      
      if (transcript) {
        handleUserQuestion(transcript);
      }
    };

    recognition.onerror = (e: any) => {
      console.log("Speech Error", e);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.warn("Recognition start failed", e);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);


  // --- Logic Handlers ---

  const handleUserQuestion = async (question: string) => {
    // Priority Interrupt: Stop nav loop logic temporarily
    processingRef.current = true;
    
    // Stop any ongoing navigation speech
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    
    playEarcon('processing'); 
    setStatus(`"${question}"`);

    try {
      // If we don't have an image yet, grab one now
      const currentImage = lastImage || cameraRef.current?.captureFrame();

      if (currentImage) {
        const answer = await askAboutImage(currentImage, question);
        setStatus(answer);
        speak(answer);
      } else {
        speak("I can't see anything yet.");
      }
    } catch (e) {
      speak("Sorry, I couldn't answer.");
    } finally {
      processingRef.current = false;
      // Resume loop immediately after answer
      scheduleNextFrame(1000); 
    }
  };

  const processNavigationFrame = async () => {
    if (!isLoopRunning.current) return;
    if (processingRef.current) {
      // If busy (e.g. Q&A), check again soon
      scheduleNextFrame(1000);
      return;
    }

    processingRef.current = true;

    try {
      const imageBase64 = cameraRef.current?.captureFrame();
      
      if (imageBase64) {
        setLastImage(imageBase64); 
        const description = await analyzeImage(imageBase64);
        
        // Only speak if user hasn't interrupted with a question in the meantime
        if (description && isLoopRunning.current) {
          setStatus(description);
          speak(description);
        }
      }
    } catch (e) {
      console.warn("Nav frame skipped", e);
    } finally {
      processingRef.current = false;
      scheduleNextFrame(4000); // Wait 4s before next scan
    }
  };

  const scheduleNextFrame = (delay: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isLoopRunning.current) {
      timerRef.current = setTimeout(processNavigationFrame, delay);
    }
  };

  // --- Effects ---

  // Lifecycle: Start/Stop
  useEffect(() => {
    if (isActive) {
      isLoopRunning.current = true;
      speak("Navigation Active.");
      startListening();
      
      // Start loop
      processNavigationFrame(); 

      return () => {
        isLoopRunning.current = false;
        if (timerRef.current) clearTimeout(timerRef.current);
        stopListening();
        if (window.speechSynthesis) window.speechSynthesis.cancel();
      };
    } else {
      isLoopRunning.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      stopListening();
      setStatus("Paused. Tap to Resume.");
    }
  }, [isActive, startListening, stopListening]);


  const toggleSession = () => {
    if (isActive) {
      setIsActive(false);
      speak("Paused.");
      vibrate([50, 50]);
    } else {
      setIsActive(true);
      // speak handled in effect
      vibrate(50);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 relative">
      
      {/* Hidden Camera Layer */}
      <div className="absolute inset-0 z-0 opacity-50">
        <CameraView ref={cameraRef} />
      </div>

      {/* Main Interactive Layer (Full Screen Button) */}
      <button 
        onClick={toggleSession}
        className="absolute inset-0 z-10 w-full h-full flex flex-col items-center justify-center p-6 bg-transparent active:bg-white/5 transition-colors"
        aria-label={isActive ? "Stop Navigation" : "Start Navigation"}
      >
        {/* Status Display - High Contrast */}
        <div className={`
           p-8 rounded-3xl backdrop-blur-md border-4 shadow-2xl max-w-sm w-full
           flex flex-col items-center text-center gap-4 transition-all duration-300
           ${isActive ? 'bg-black/60 border-yellow-400' : 'bg-slate-800/90 border-slate-600'}
        `}>
          
          {isActive ? (
             isListening ? <Mic size={48} className="text-red-500 animate-pulse" /> 
                         : <Navigation size={48} className="text-yellow-400" />
          ) : (
             <StopCircle size={48} className="text-slate-400" />
          )}

          <h2 className={`text-2xl font-black uppercase ${isActive ? 'text-white' : 'text-slate-400'}`}>
            {isActive ? "Monitoring" : "Paused"}
          </h2>

          <p className="text-xl font-bold text-yellow-300 leading-snug min-h-[3rem]">
            {status}
          </p>
          
          {isActive && processingRef.current && !isListening && (
            <Loader2 className="animate-spin text-white opacity-50" size={24}/>
          )}
        </div>

        {/* Footer Instruction */}
        <div className="absolute bottom-10 opacity-70 bg-black/50 px-4 py-2 rounded-full">
          <p className="text-white font-medium">
            {isActive ? "Tap anywhere to Pause" : "Tap anywhere to Start"}
          </p>
        </div>
      </button>

      {/* Back Button (Small, top left) */}
      <div className="absolute top-4 left-4 z-20">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            navigate(AppRoute.HOME);
          }}
          className="p-3 bg-slate-800 rounded-full text-white border border-slate-600"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
      </div>

    </div>
  );
};