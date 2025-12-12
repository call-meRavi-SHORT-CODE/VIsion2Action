import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CameraView } from '../components/CameraView';
import { CameraHandle, AppRoute, MemoryTag } from '../types';
import { analyzeImage, askAboutImage } from '../services/geminiService';
import { speak, vibrate, playEarcon } from '../services/accessibilityService';
import { getTags, addTag, removeTag } from '../services/memoryService';
import { Mic, StopCircle, Navigation, Loader2, Tag as TagIcon, Trash2 } from 'lucide-react';

export const ContinuousScreen: React.FC = () => {
  const navigate = useNavigate();
  const cameraRef = useRef<CameraHandle>(null);
  
  // States
  const [isActive, setIsActive] = useState(true); 
  const [status, setStatus] = useState<string>("Initializing...");
  const [isListening, setIsListening] = useState(false);
  const [lastImage, setLastImage] = useState<string | null>(null);
  const [tags, setTags] = useState<MemoryTag[]>([]);

  // Refs for loop management
  const isLoopRunning = useRef(true);
  const processingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Refs for Interaction
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<any>(null);
  const isLongPressHandled = useRef(false);
  const hasRecognitionResult = useRef(false);

  // --- Voice Recognition Logic ---

  const startVoiceQuery = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      speak("Voice control not supported.");
      return;
    }

    window.speechSynthesis.cancel();
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false; 
    recognition.interimResults = false;
    
    hasRecognitionResult.current = false;

    recognition.onstart = () => {
      setIsListening(true);
      playEarcon('listen');
      setStatus("Listening...");
      vibrate(100);
    };

    recognition.onend = () => {
      if (!hasRecognitionResult.current) {
         setIsListening(false);
         if (processingRef.current) {
            processingRef.current = false;
            scheduleNextFrame(500);
         }
      }
    };

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript.trim();
      if (transcript) {
        hasRecognitionResult.current = true;
        handleVoiceInput(transcript);
      }
    };

    recognition.onerror = (e: any) => {
      console.warn("Speech Error", e);
      setIsListening(false);
      hasRecognitionResult.current = false; 
      processingRef.current = false;
      scheduleNextFrame(1000);
      
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
         speak("Mic error.");
      }
    };

    try {
      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn("Recognition start failed", e);
      processingRef.current = false;
    }
  };

  const stopVoiceQuery = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
  };

  // --- Logic Handlers ---

  const handleVoiceInput = async (transcript: string) => {
    setIsListening(false);
    processingRef.current = true; // Keep loop locked
    
    playEarcon('processing'); 
    
    // Check for "Remember/Mark" intent
    const lower = transcript.toLowerCase();
    if (lower.startsWith("remember") || lower.startsWith("mark this") || lower.includes("mark as")) {
       handleMemoryCommand(transcript);
    } else {
       handleUserQuestion(transcript);
    }
  };

  const handleMemoryCommand = async (transcript: string) => {
    setStatus(`Tagging: "${transcript}"`);
    
    // Simulate brief processing delay
    await new Promise(r => setTimeout(r, 500));

    const result = addTag(transcript);
    
    if (result.success) {
      setTags(getTags()); // Update UI
      speak(result.message);
      setStatus(result.message);
      vibrate([50, 50]);
    } else {
      speak(result.message);
      setStatus(result.message);
      vibrate(500); // Long vibrate for error
    }

    setTimeout(() => {
      processingRef.current = false;
      scheduleNextFrame(1000); 
    }, 2000);
  };

  const handleUserQuestion = async (question: string) => {
    setStatus(`"${question}"`);

    try {
      const currentImage = cameraRef.current?.captureFrame() || lastImage;

      if (currentImage) {
        const answer = await askAboutImage(currentImage, question);
        setStatus(answer);
        speak(answer);
      } else {
        speak("I can't see anything right now.");
      }
    } catch (e) {
      speak("Sorry, I couldn't answer.");
    } finally {
      setTimeout(() => {
        processingRef.current = false;
        scheduleNextFrame(1000); 
      }, 4000); 
    }
  };

  const processNavigationFrame = async () => {
    if (!isLoopRunning.current) return;
    
    if (processingRef.current || isListening) {
      scheduleNextFrame(500);
      return;
    }

    processingRef.current = true;

    try {
      const imageBase64 = cameraRef.current?.captureFrame();
      
      if (imageBase64) {
        setLastImage(imageBase64); 
        // Pass the active tags to the AI analysis
        const description = await analyzeImage(imageBase64, tags);
        
        if (description && isLoopRunning.current && !isListening && processingRef.current) {
          setStatus(description);
          speak(description);
        }
      }
    } catch (e) {
      console.warn("Nav frame skipped", e);
    } finally {
      processingRef.current = false;
      scheduleNextFrame(4000); 
    }
  };

  const scheduleNextFrame = (delay: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isLoopRunning.current) {
      timerRef.current = setTimeout(processNavigationFrame, delay);
    }
  };

  const handleDeleteTag = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeTag(id);
    setTags(getTags());
    speak("Tag deleted.");
  };

  // --- Interaction Handlers ---

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (isActive) window.speechSynthesis.cancel();
    
    isLongPressHandled.current = false;
    
    longPressTimer.current = setTimeout(() => {
      isLongPressHandled.current = true;
      processingRef.current = true; 
      startVoiceQuery();
    }, 500); 
  };

  const handlePointerUp = (e: React.MouseEvent | React.TouchEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (isLongPressHandled.current) {
      stopVoiceQuery();
    } else {
      toggleSession();
    }
  };

  const toggleSession = () => {
    if (isActive) {
      setIsActive(false);
      speak("Paused.");
      vibrate([50, 50]);
    } else {
      setIsActive(true);
      vibrate(50);
    }
  };

  // --- Effects ---

  useEffect(() => {
    setTags(getTags()); // Load tags on mount
    
    if (isActive) {
      isLoopRunning.current = true;
      speak("Navigation Active.");
      timerRef.current = setTimeout(processNavigationFrame, 1000);
    } else {
      isLoopRunning.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setStatus("Paused. Tap to Resume.");
    }
    
    return () => {
      isLoopRunning.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  return (
    <div className="flex flex-col h-full bg-slate-900 relative select-none">
      
      {/* Hidden Camera Layer */}
      <div className="absolute inset-0 z-0 opacity-50">
        <CameraView ref={cameraRef} />
      </div>

      {/* Tags Overlay */}
      {tags.length > 0 && (
         <div className="absolute top-16 left-0 right-0 z-20 flex justify-center gap-2 pointer-events-none px-4">
           {tags.map(tag => (
             <div key={tag.id} className="bg-blue-600/90 text-white text-xs px-3 py-1 rounded-full backdrop-blur flex items-center shadow-lg animate-in fade-in zoom-in duration-300">
               <TagIcon size={10} className="mr-1" />
               <span className="font-bold mr-2 uppercase">{tag.name}</span>
               {/* Delete button needs pointer-events-auto */}
               <button 
                 onClick={(e) => handleDeleteTag(tag.id, e)}
                 className="pointer-events-auto p-1 hover:text-red-300 active:scale-90"
                 aria-label={`Delete ${tag.name}`}
               >
                 <Trash2 size={12} />
               </button>
             </div>
           ))}
         </div>
      )}

      {/* Main Interactive Layer */}
      <div 
        onMouseDown={handlePointerDown}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchEnd={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
        className="absolute inset-0 z-10 w-full h-full flex flex-col items-center justify-center p-6 bg-transparent active:bg-white/5 transition-colors cursor-pointer touch-none"
        role="button"
        aria-label={isListening ? "Listening" : (isActive ? "Stop Navigation" : "Start Navigation")}
        tabIndex={0}
      >
        <div className={`
           p-8 rounded-3xl backdrop-blur-md border-4 shadow-2xl max-w-sm w-full
           flex flex-col items-center text-center gap-4 transition-all duration-300
           ${isListening ? 'bg-red-900/80 border-red-500 scale-110' : (isActive ? 'bg-black/60 border-yellow-400' : 'bg-slate-800/90 border-slate-600')}
        `}>
          
          {isListening ? (
             <Mic size={64} className="text-white animate-pulse" />
          ) : isActive ? (
             <Navigation size={48} className="text-yellow-400" />
          ) : (
             <StopCircle size={48} className="text-slate-400" />
          )}

          <h2 className={`text-2xl font-black uppercase ${isActive || isListening ? 'text-white' : 'text-slate-400'}`}>
            {isListening ? "Listening..." : (isActive ? "Monitoring" : "Paused")}
          </h2>

          <p className="text-xl font-bold text-yellow-300 leading-snug min-h-[3rem]">
            {status}
          </p>
          
          {isActive && processingRef.current && !isListening && (
            <Loader2 className="animate-spin text-white opacity-50" size={24}/>
          )}
        </div>

        <div className="absolute bottom-10 opacity-80 bg-black/60 px-6 py-3 rounded-full border border-white/10 backdrop-blur">
          <p className="text-white font-bold tracking-wide">
             Hold to "Mark this as..."
          </p>
        </div>
      </div>

      {/* Back Button */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            navigate(AppRoute.HOME);
          }}
          className="p-3 bg-slate-800 rounded-full text-white border border-slate-600 pointer-events-auto"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
      </div>

    </div>
  );
};