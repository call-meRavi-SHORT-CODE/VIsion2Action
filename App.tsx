import React, { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { HomeScreen } from './pages/HomeScreen';
import { ScanScreen } from './pages/ScanScreen';
import { ContinuousScreen } from './pages/ContinuousScreen';
import { AppRoute } from './types';

export default function App() {
  
  // Set 100vh fix for mobile browsers
  useEffect(() => {
    const setHeight = () => {
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
    };
    window.addEventListener('resize', setHeight);
    setHeight();
    return () => window.removeEventListener('resize', setHeight);
  }, []);

  return (
    <div 
      className="bg-slate-900 text-white w-full overflow-hidden mx-auto shadow-2xl relative"
      style={{ height: 'var(--app-height, 100vh)', maxWidth: '600px' }} // Restrict width on desktop for mobile feel
    >
      <HashRouter>
        <Routes>
          <Route path={AppRoute.HOME} element={<HomeScreen />} />
          <Route path={AppRoute.SCAN} element={<ScanScreen />} />
          <Route path={AppRoute.CONTINUOUS} element={<ContinuousScreen />} />
        </Routes>
      </HashRouter>
    </div>
  );
}