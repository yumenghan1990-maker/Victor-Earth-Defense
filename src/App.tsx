import React, { useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameState } from './types';
import { WIN_SCORE } from './constants';
import { Shield, Target, Trophy, Info, Globe, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [language, setLanguage] = useState<'en' | 'zh'>('en');

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'zh' : 'en');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-cyan-500/30">
      {/* HUD Header */}
      <header className="fixed top-0 left-0 w-full z-50 p-4 md:p-6 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-900/20">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none uppercase">
                Victor Earth
              </h1>
              <p className="text-[10px] text-cyan-400 font-mono tracking-[0.2em] uppercase opacity-80">
                Defense System v1.0
              </p>
            </div>
          </div>
          
          <div className="mt-4 space-y-1">
             <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-red-500" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider leading-none">
                    {language === 'en' ? 'Tactical Score' : '战术得分'}
                  </span>
                  <span className="text-2xl font-black font-mono text-white tracking-widest">
                    {gameState?.score ?? 0}<span className="text-xs text-gray-600 opacity-50 ml-1">/{WIN_SCORE}</span>
                  </span>
                </div>
             </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3 pointer-events-auto">
          <button 
            onClick={toggleLanguage}
            className="bg-white/5 hover:bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 transition-all active:scale-95 group"
          >
            <Languages className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform" />
            <span className="text-sm font-bold">{language === 'en' ? '中文' : 'English'}</span>
          </button>

          {gameState?.status === 'playing' && (
            <div className="flex flex-col items-end gap-1">
               <div className="flex gap-1">
                 {gameState.cities.map((city, i) => (
                   <div 
                    key={city.id} 
                    className={`w-3 h-3 rounded-sm transition-colors duration-500 ${city.alive ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'bg-red-900'}`} 
                   />
                 ))}
               </div>
               <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest leading-none mt-1">
                 {language === 'en' ? 'Populated Zones' : '人口定居点'}
               </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Game Container */}
      <main className="w-full h-screen flex items-center justify-center p-0 md:p-4 bg-[radial-gradient(circle_at_center,rgba(10,10,20,1)_0%,rgba(0,0,0,1)_100%)]">
        <div className="w-full max-w-5xl h-full md:h-[80vh] bg-black rounded-none md:rounded-3xl overflow-hidden border-0 md:border border-white/5 shadow-2xl relative">
          <GameCanvas 
            onStateChange={setGameState} 
            isPaused={false} 
            language={language}
            onRestart={() => {}}
          />
          
          {/* Progress Bar for Score */}
          {gameState?.status === 'playing' && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5">
              <motion.div 
                className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                initial={{ width: 0 }}
                animate={{ width: `${(gameState.score / WIN_SCORE) * 100}%` }}
                transition={{ type: 'spring', damping: 20 }}
              />
            </div>
          )}
        </div>
      </main>

      {/* Footer Info */}
      <footer className="fixed bottom-0 left-0 w-full p-6 flex justify-between items-end pointer-events-none">
        <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/5 pointer-events-auto">
          <p className="text-[10px] text-gray-400 font-mono flex items-center gap-2">
            <Info className="w-3 h-3 text-cyan-500" />
            {language === 'en' 
              ? 'CLICK TO INTERCEPT INCOMING ROCKETS' 
              : '点击屏幕拦截来袭火箭'}
          </p>
        </div>
        
        {gameState?.status === 'playing' && (
          <div className="flex gap-4 pointer-events-auto">
            {gameState.batteries.map((b, i) => (
              <div key={b.id} className="flex flex-col items-center gap-1">
                <div className="h-20 w-8 bg-white/5 rounded-t-lg border-x border-t border-white/10 relative overflow-hidden flex flex-col justify-end">
                   <motion.div 
                    className={`w-full bg-cyan-600/40`}
                    initial={{ height: '100%' }}
                    animate={{ height: `${(b.missiles / b.maxMissiles) * 100}%` }}
                   />
                   <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-black text-white/50">{b.missiles}</span>
                   </div>
                </div>
                <span className="text-[8px] text-white/40 font-black tracking-widest">{i === 1 ? 'CENTER' : i === 0 ? 'LEFT' : 'RIGHT'}</span>
              </div>
            ))}
          </div>
        )}
      </footer>
    </div>
  );
}
