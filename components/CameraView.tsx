import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { CameraHandle } from '../types';

interface CameraViewProps {
  onReady?: () => void;
}

export const CameraView = forwardRef<CameraHandle, CameraViewProps>(({ onReady }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');

  const startCamera = async () => {
    try {
      if (stream) return;
      
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' }, // Prefer rear camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.error("Play error:", e));
          if (onReady) onReady();
        };
      }
      setError('');
    } catch (err) {
      console.error("Camera Access Error:", err);
      // Fallback: try without constraints (e.g. laptop webcam)
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setStream(fallbackStream);
         if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.onloadedmetadata = () => {
             videoRef.current?.play();
             if (onReady) onReady();
          };
        }
      } catch (e2) {
         setError("Camera permission denied or not available.");
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureFrame = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Resize to a smaller dimension for faster API transmission
    // 512px width is sufficient for general navigation/Q&A
    const scale = 512 / video.videoWidth;
    const w = 512;
    const h = video.videoHeight * scale;

    canvas.width = w;
    canvas.height = h;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, w, h);
    
    // Return base64 JPEG with moderate compression
    return canvas.toDataURL('image/jpeg', 0.7);
  };

  useImperativeHandle(ref, () => ({
    startCamera,
    stopCamera,
    captureFrame
  }));

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative flex-1 w-full h-full bg-black overflow-hidden rounded-xl">
      {error ? (
        <div className="flex h-full items-center justify-center p-6 text-center">
          <p className="text-red-500 text-xl font-bold">{error}</p>
        </div>
      ) : (
        <>
          <video 
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover" 
            playsInline 
            muted 
            autoPlay
          />
          <canvas ref={canvasRef} className="hidden" />
        </>
      )}
    </div>
  );
});

CameraView.displayName = 'CameraView';