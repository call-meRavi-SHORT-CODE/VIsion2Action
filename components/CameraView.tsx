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
          videoRef.current?.play();
          if (onReady) onReady();
        };
      }
      setError('');
    } catch (err) {
      console.error("Camera Access Error:", err);
      setError("Camera permission denied or not available.");
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
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Return base64 JPEG
    return canvas.toDataURL('image/jpeg', 0.6); // 0.6 quality for speed
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