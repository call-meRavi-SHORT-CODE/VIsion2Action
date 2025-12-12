import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CameraView } from '../components/CameraView';
import { BigButton } from '../components/BigButton';
import { CameraHandle, AppRoute } from '../types';
import { analyzeImage, askAboutImage } from '../services/geminiService';
import { speak, vibrate, playEarcon } from '../services/accessibilityService';
import { ArrowLeft, Loader2, Mic } from 'lucide-react';

export const ScanScreen: React.FC = () => {
  const navigate = useNavigate();
  const cameraRef = useRef<CameraHandle>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastResult, setLastResult] = useState<string>("");
  const [lastImage, setLastImage] = useState<string | null>(null);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  const handleScan = async () => {
    if (isProcessing || isListening) return;
    
    // Feedback
    vibrate(50);
    speak("Scanning...");
    setIsProcessing(true);
    setLastResult("");

    try {
      const imageBase64 = cameraRef.current?.captureFrame();
      
      if (!imageBase64) {
        throw new Error("Could not capture frame");
      }
      
      setLastImage(imageBase64);

      // Pass empty array for tags in single scan mode
      const description = await analyzeImage(imageBase64, []);
      
      setLastResult(description);
      speak(description);
      vibrate([50, 50]); // Double tap for success

    } catch (error) {
      console.error(error);
      speak("Error capturing image.");
      setLastResult("Error: Could not scan.");
      vibrate(500); 
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAskQuestion = () => {
    if (!lastImage) {
      speak("Please scan a scene first.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      speak("Voice features are not supported on this device.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      playEarcon('listen'); // Audio cue
      setLastResult("Listening...");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = async (event: any) => {
      const question = event.results[0][0].transcript;
      if (question) {
        // Stop listening state immediately so UI updates
        setIsListening(false);
        setIsProcessing(true);
        
        playEarcon('processing');
        speak(`Asking: ${question}`);
        setLastResult(`"${question}"`);
        
        try {
          const answer = await askAboutImage(lastImage, question);
          setLastResult(answer);
          speak(answer);
        } catch (e) {
          speak("Sorry, I couldn't get an answer.");
        } finally {
          setIsProcessing(false);
        }
      }
    };

    recognition.onerror = (e: any) => {
      setIsListening(false);
      playEarcon('stop'); // Error cue
      // If no speech was detected, just return to state
      if (e.error === 'no-speech') {
        speak("I didn't hear anything.");
      } else {
        speak("Microphone error.");
      }
    };

    recognition.start();
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between py-2">
        <button 
          onClick={() => navigate(AppRoute.HOME)}
          className="p-4 bg-slate-800 rounded-full text-white hover:bg-slate-700 border-2 border-slate-700 focus:border-yellow-400"
          aria-label="Go Back"
        >
          <ArrowLeft size={32} />
        </button>
        <h1 className="text-2xl font-bold text-white">Single Scan</h1>
        <div className="w-16" /> 
      </div>

      {/* Camera View */}
      <div className="flex-1 rounded-2xl overflow-hidden border-4 border-slate-700 relative shadow-inner bg-black">
        <CameraView ref={cameraRef} />
        
        {/* Processing/Listening Overlay */}
        {(isProcessing || isListening) && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10 backdrop-blur-sm">
            <div className="flex flex-col items-center p-6 text-center">
              {isListening ? (
                <>
                  <Mic className="w-20 h-20 text-red-500 animate-pulse mb-6" />
                  <p className="text-white text-3xl font-bold">Listening...</p>
                </>
              ) : (
                <>
                  <Loader2 className="w-20 h-20 text-yellow-400 animate-spin mb-6" />
                  <p className="text-yellow-400 text-2xl font-bold">Thinking...</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Text Output Box */}
      <div 
        className="bg-slate-800 p-4 rounded-xl min-h-[5rem] flex items-center justify-center border-2 border-slate-600"
        aria-live="polite"
      >
        <p className="text-xl text-white font-medium text-center leading-relaxed">
          {lastResult || "Ready to scan."}
        </p>
      </div>

      {/* Controls Area */}
      <div className="h-32">
        {lastImage ? (
           <div className="flex gap-4 h-full">
             <div className="flex-1">
               <BigButton 
                 title="ASK QUESTION" 
                 subtitle="Use Mic"
                 onPress={handleAskQuestion} 
                 color="secondary"
                 fullHeight
               />
             </div>
             <div className="flex-1">
                <BigButton 
                  title="NEW SCAN" 
                  subtitle="Capture"
                  onPress={handleScan} 
                  fullHeight
                />
             </div>
           </div>
        ) : (
          <BigButton 
            title={isProcessing ? "PROCESSING..." : "SCAN SCENE"} 
            subtitle="Capture Image"
            onPress={handleScan} 
            disabled={isProcessing}
            fullHeight
          />
        )}
      </div>
    </div>
  );
};