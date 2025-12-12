import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CameraView } from '../components/CameraView';
import { CameraHandle, AppRoute } from '../types';
import { analyzeImage, askAboutImage } from '../services/geminiService';
import { speak, vibrate, playEarcon } from '../services/accessibilityService';
import { ArrowLeft, Mic, StopCircle } from 'lucide-react';

// Polyfill types for SpeechRecognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

type InteractionState = 'IDLE' | 'SCANNING' | 'SPEAKING' | 'LISTENING' | 'PROCESSING_QA';

export const ScanScreen: React.FC = () => {
  const navigate = useNavigate();
  const cameraRef = useRef<CameraHandle>(null);
  
  // State
  const [state, setState] = useState<InteractionState>('IDLE');
  const [displayText, setDisplayText] = useState("Tap anywhere to start conversation");
  const [lastImage, setLastImage] = useState<string | null>(null);
  
  // Refs for loop control
  const recognitionRef = useRef<any>(null);
  const isLoopActiveRef = useRef(false);

  // Stop everything (Speech, TTS, Loop)
  const stopInteraction = () => {
    isLoopActiveRef.current = false;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
    }
    setState('IDLE');
    setDisplayText("Tap to scan again.");
    playEarcon('stop');
    vibrate(50);
  };

  const startScan = async () => {
    isLoopActiveRef.current = true;
    setState('SCANNING');
    setDisplayText("Scanning scene...");
    vibrate(50);
    speak("Scanning.");

    try {
      // Small delay to let TTS start
      await new Promise(r => setTimeout(r, 500));
      
      const imageBase64 = cameraRef.current?.captureFrame();
      if (!imageBase64) throw new Error("Camera failed");
      
      setLastImage(imageBase64);
      
      const description = await analyzeImage(imageBase64);
      setDisplayText(description);
      
      // Start the conversation loop
      setState('SPEAKING');
      speak(description, () => {
        // Callback when description is done speaking
        if (isLoopActiveRef.current) {
          startListening();
        }
      });

    } catch (e) {
      console.error(e);
      speak("Error. Please try again.");
      setState('IDLE');
    }
  };

  const startListening = () => {
    if (!isLoopActiveRef.current) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      speak("Voice control not available.");
      setState('IDLE');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setState('LISTENING');
      setDisplayText("Listening for question...");
      playEarcon('listen'); // Ding!
    };

    recognition.onend = () => {
      // If we are still in LISTENING state when it ends, it means no speech was detected
      // or it timed out. We stop the loop to avoid annoying the user.
      if (isLoopActiveRef.current && state === 'LISTENING') {
        setState('IDLE');
        setDisplayText("Conversation ended. Tap to restart.");
        playEarcon('stop');
      }
    };

    recognition.onresult = async (event: any) => {
      const question = event.results[0][0].transcript;
      if (!question) return;

      setState('PROCESSING_QA');
      setDisplayText(`"${question}"`);
      playEarcon('processing'); // Blip
      
      if (lastImage) {
        // Send to Gemini
        const answer = await askAboutImage(lastImage, question);
        setDisplayText(answer);
        
        setState('SPEAKING');
        speak(answer, () => {
          // Loop back to listening after answer
          if (isLoopActiveRef.current) {
            startListening();
          }
        });
      }
    };

    recognition.onerror = () => {
      setState('IDLE');
      setDisplayText("Microphone error. Tap to retry.");
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isLoopActiveRef.current = false;
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
      }
    };
  }, []);

  const getBackgroundColor = () => {
    switch(state) {
      case 'IDLE': return 'bg-slate-900';
      case 'SCANNING': return 'bg-blue-900';
      case 'SPEAKING': return 'bg-slate-800';
      case 'LISTENING': return 'bg-red-900'; // Distinct color when mic is open
      case 'PROCESSING_QA': return 'bg-purple-900';
      default: return 'bg-slate-900';
    }
  };

  return (
    <div className={`flex flex-col h-full ${getBackgroundColor()} transition-colors duration-500 p-4 relative`}>
      
      {/* Header */}
      <div className="flex items-center justify-between z-20 pointer-events-none">
        <button 
          onClick={() => {
            stopInteraction();
            navigate(AppRoute.HOME);
          }}
          className="p-4 bg-slate-800 rounded-full text-white pointer-events-auto border-2 border-slate-600"
          aria-label="Go Back"
        >
          <ArrowLeft size={32} />
        </button>
        {state === 'LISTENING' && <Mic className="text-red-400 animate-pulse" size={32} />}
      </div>

      {/* Main Touch Area - Covers entire background */}
      <div 
        onClick={() => {
          if (state === 'IDLE') startScan();
          else stopInteraction();
        }}
        className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center cursor-pointer"
        role="button"
        aria-label={state === 'IDLE' ? "Start Scan" : "Stop Conversation"}
      >
        {/* Invisible camera needed for capture */}
        <div className="opacity-0 absolute pointer-events-none h-1 w-1 overflow-hidden">
          <CameraView ref={cameraRef} />
        </div>

        {/* Dynamic Status Text */}
        <div className="bg-black/40 backdrop-blur-sm p-6 rounded-3xl border-2 border-white/10 max-w-sm pointer-events-none select-none">
          <p className={`font-bold text-white leading-tight transition-all duration-300 ${state === 'IDLE' ? 'text-3xl' : 'text-2xl'}`}>
            {displayText}
          </p>
        </div>

        {/* Instructions */}
        <div className="absolute bottom-12 pointer-events-none opacity-60">
           {state === 'IDLE' 
             ? <p className="text-xl font-medium text-yellow-400 uppercase tracking-widest animate-pulse">Tap Screen to Scan</p>
             : <div className="flex flex-col items-center text-slate-300">
                 <StopCircle size={48} className="mb-2" />
                 <p className="uppercase font-bold">Tap to Stop</p>
               </div>
           }
        </div>
      </div>
    </div>
  );
};