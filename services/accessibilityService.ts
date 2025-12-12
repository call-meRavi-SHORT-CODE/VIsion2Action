export const speak = (text: string, onEnd?: () => void) => {
  if (!window.speechSynthesis) {
    if (onEnd) setTimeout(onEnd, 100);
    return;
  }

  // Cancel current speech to avoid queue buildup
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.1; // Slightly faster for efficiency
  utterance.pitch = 1.0;
  
  // Prefer a clear Google voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || voices[0];
  if (preferredVoice) utterance.voice = preferredVoice;

  // Handle completion
  utterance.onend = () => {
    if (onEnd) onEnd();
  };
  
  // Handle error (e.g. if speech is canceled)
  utterance.onerror = () => {
    // If canceled, we might not want to trigger onEnd, but for this app's loop, 
    // we generally want to reset state if speech fails.
    // However, explicit cancel usually shouldn't trigger next step.
  };

  window.speechSynthesis.speak(utterance);
};

export const vibrate = (pattern: number | number[] = 200) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

export const announce = (text: string) => {
  speak(text);
};

// Simple audio synthesis for earcons (sound cues)
// This avoids needing external mp3 assets
export const playEarcon = (type: 'listen' | 'stop' | 'processing') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'listen') {
      // High-pitched "Ding"
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'stop') {
      // Low-pitched descending thud
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'processing') {
      // Quick blip
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch (e) {
    console.warn("Audio context error", e);
  }
};