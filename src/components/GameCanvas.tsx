import React, { useCallback, useEffect, useRef, useState } from 'react';
import { 
  GAME_WIDTH, 
  GAME_HEIGHT, 
  ROCKET_SPEED_BASE, 
  MISSILE_SPEED, 
  EXPLOSION_MAX_RADIUS, 
  EXPLOSION_GROWTH_RATE,
  COLORS,
  INITIAL_BATTERIES,
  INITIAL_CITIES,
  WIN_SCORE,
  POINTS_PER_ROCKET
} from '../constants';
import { GameState, Rocket, PlayerMissile, Explosion, Point } from '../types';
import { useGameLoop } from '../hooks/useGameLoop';
import { getDistance, getPointOnLine, isPointInCircle } from '../utils/math';

interface GameCanvasProps {
  onStateChange: (state: GameState) => void;
  isPaused: boolean;
  language: 'en' | 'zh';
  onRestart: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ onStateChange, isPaused, language, onRestart }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>({
    score: 0,
    cities: INITIAL_CITIES.map(c => ({ ...c })),
    batteries: INITIAL_BATTERIES.map(b => ({ ...b })),
    rockets: [],
    playerMissiles: [],
    explosions: [],
    status: 'idle',
    level: 1,
    rocketsSpawnedInWave: 0,
    totalRocketsInWave: 10,
  });

  const [shake, setShake] = useState(0);

  const nextRocketTimeRef = useRef(0);

  const spawnRocket = useCallback(() => {
    if (stateRef.current.rocketsSpawnedInWave >= stateRef.current.totalRocketsInWave) return;

    const startX = Math.random() * GAME_WIDTH;
    const targets = [
      ...stateRef.current.cities.filter(c => c.alive).map(c => ({ x: c.x, y: GAME_HEIGHT - 20 })),
      ...stateRef.current.batteries.filter(b => b.alive).map(b => ({ x: b.x, y: GAME_HEIGHT - 20 }))
    ];

    if (targets.length === 0) return;

    const target = targets[Math.floor(Math.random() * targets.length)];
    const speed = ROCKET_SPEED_BASE + (stateRef.current.level * 0.1);

    const newRocket: Rocket = {
      id: Math.random().toString(36).substr(2, 9),
      start: { x: startX, y: 0 },
      end: target,
      current: { x: startX, y: 0 },
      speed: speed / getDistance({ x: startX, y: 0 }, target),
      progress: 0,
    };

    stateRef.current.rockets.push(newRocket);
    stateRef.current.rocketsSpawnedInWave++;
  }, []);

  const handleCanvasClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (stateRef.current.status !== 'playing' || isPaused) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    // Find best battery
    let bestBatteryIndex = -1;
    let minDist = Infinity;

    stateRef.current.batteries.forEach((b, index) => {
      if (b.alive && b.missiles > 0) {
        const d = Math.abs(b.x - x);
        if (d < minDist) {
          minDist = d;
          bestBatteryIndex = index;
        }
      }
    });

    if (bestBatteryIndex !== -1) {
      const battery = stateRef.current.batteries[bestBatteryIndex];
      battery.missiles--;
      
      const start = { x: battery.x, y: GAME_HEIGHT - 30 };
      const target = { x, y };
      const distance = getDistance(start, target);
      
      stateRef.current.playerMissiles.push({
        id: Math.random().toString(36).substr(2, 9),
        batteryIndex: bestBatteryIndex,
        start,
        target,
        current: { ...start },
        speed: MISSILE_SPEED / distance,
        progress: 0,
      });
    }
  };

  const update = useCallback((delta: number) => {
    if (stateRef.current.status !== 'playing' || isPaused) return;

    if (shake > 0) {
      setShake(prev => Math.max(0, prev - delta * 0.05));
    }

    // Spawn rockets
    if (stateRef.current.rocketsSpawnedInWave < stateRef.current.totalRocketsInWave) {
      nextRocketTimeRef.current -= delta;
      if (nextRocketTimeRef.current <= 0) {
        spawnRocket();
        nextRocketTimeRef.current = Math.max(300, 2000 - (stateRef.current.level * 150));
      }
    }

    // Update Player Missiles
    stateRef.current.playerMissiles = stateRef.current.playerMissiles.filter(m => {
      m.progress += m.speed * (delta / 16.67);
      if (m.progress >= 1) {
        stateRef.current.explosions.push({
          id: Math.random().toString(36).substr(2, 9),
          x: m.target.x,
          y: m.target.y,
          radius: 2,
          maxRadius: EXPLOSION_MAX_RADIUS,
          growthRate: EXPLOSION_GROWTH_RATE,
          state: 'growing'
        });
        return false;
      }
      m.current = getPointOnLine(m.start, m.target, m.progress);
      return true;
    });

    // Update Explosions
    stateRef.current.explosions = stateRef.current.explosions.filter(e => {
      const rate = e.growthRate * (delta / 16.67);
      if (e.state === 'growing') {
        e.radius += rate;
        if (e.radius >= e.maxRadius) e.state = 'shrinking';
      } else {
        e.radius -= rate;
      }
      return e.radius > 0;
    });

    // Update Rockets & Collision
    stateRef.current.rockets = stateRef.current.rockets.filter(r => {
      r.progress += r.speed * (delta / 16.67);
      r.current = getPointOnLine(r.start, r.end, r.progress);

      // Check collision with explosions
      for (const explosion of stateRef.current.explosions) {
        if (isPointInCircle(r.current.x, r.current.y, explosion.x, explosion.y, explosion.radius)) {
          stateRef.current.score += POINTS_PER_ROCKET;
          // Trigger small explosion for rocket destruction
          stateRef.current.explosions.push({
            id: Math.random().toString(36).substr(2, 9),
            x: r.current.x,
            y: r.current.y,
            radius: 1,
            maxRadius: 15,
            growthRate: EXPLOSION_GROWTH_RATE,
            state: 'growing'
          });
          return false;
        }
      }

      // Check impact
      if (r.progress >= 1) {
        setShake(10);
        // Find what was hit
        const hitCity = stateRef.current.cities.find(c => Math.abs(c.x - r.end.x) < 5 && r.end.y > GAME_HEIGHT - 30);
        if (hitCity) hitCity.alive = false;

        const hitBattery = stateRef.current.batteries.find(b => Math.abs(b.x - r.end.x) < 5 && r.end.y > GAME_HEIGHT - 30);
        if (hitBattery) hitBattery.alive = false;

        stateRef.current.explosions.push({
          id: Math.random().toString(36).substr(2, 9),
          x: r.end.x,
          y: r.end.y,
          radius: 5,
          maxRadius: 40,
          growthRate: EXPLOSION_GROWTH_RATE,
          state: 'growing'
        });
        return false;
      }

      return true;
    });

    // Check game over / win / wave end
    if (stateRef.current.score >= WIN_SCORE) {
      stateRef.current.status = 'won';
    } else if (stateRef.current.batteries.every(b => !b.alive)) {
      stateRef.current.status = 'lost';
    } else if (
      stateRef.current.rocketsSpawnedInWave >= stateRef.current.totalRocketsInWave &&
      stateRef.current.rockets.length === 0 &&
      stateRef.current.playerMissiles.length === 0 &&
      stateRef.current.explosions.length === 0
    ) {
      // Wave end logic
      stateRef.current.status = 'between_waves';
      // Missile bonus
      stateRef.current.batteries.forEach(b => {
        if (b.alive) {
          stateRef.current.score += b.missiles * 5;
          b.missiles = b.maxMissiles;
        }
      });
    }

    onStateChange({ ...stateRef.current });
  }, [onStateChange, spawnRocket, isPaused, shake]);

  const startNextWave = () => {
    stateRef.current.level++;
    stateRef.current.rocketsSpawnedInWave = 0;
    stateRef.current.totalRocketsInWave = 10 + (stateRef.current.level * 2);
    stateRef.current.status = 'playing';
    nextRocketTimeRef.current = 1000;
  };

  useGameLoop(update, true);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.save();
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw Ground
    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(0, GAME_HEIGHT - 20, GAME_WIDTH, 20);

    // Draw Cities
    stateRef.current.cities.forEach(city => {
      if (!city.alive) return;
      ctx.fillStyle = COLORS.city;
      ctx.fillRect(city.x - 15, GAME_HEIGHT - 40, 30, 20);
      // Windows
      ctx.fillStyle = '#000';
      ctx.fillRect(city.x - 10, GAME_HEIGHT - 35, 5, 5);
      ctx.fillRect(city.x + 5, GAME_HEIGHT - 35, 5, 5);
    });

    // Draw Batteries
    stateRef.current.batteries.forEach(battery => {
      if (!battery.alive) {
        // Draw ruins
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.moveTo(battery.x - 20, GAME_HEIGHT - 20);
        ctx.lineTo(battery.x, GAME_HEIGHT - 30);
        ctx.lineTo(battery.x + 20, GAME_HEIGHT - 20);
        ctx.fill();
        return;
      }
      ctx.fillStyle = COLORS.battery;
      ctx.beginPath();
      ctx.moveTo(battery.x - 25, GAME_HEIGHT - 20);
      ctx.lineTo(battery.x, GAME_HEIGHT - 50);
      ctx.lineTo(battery.x + 25, GAME_HEIGHT - 20);
      ctx.fill();

      // Missile count dots
      ctx.fillStyle = '#fff';
      const rows = 3;
      const cols = Math.ceil(battery.missiles / rows);
      for (let i = 0; i < battery.missiles; i++) {
        const r = i % rows;
        const c = Math.floor(i / rows);
        ctx.beginPath();
        ctx.arc(battery.x - 15 + c * 4, GAME_HEIGHT - 40 + r * 6, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw Rockets
    stateRef.current.rockets.forEach(rocket => {
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rocket.start.x, rocket.start.y);
      ctx.lineTo(rocket.current.x, rocket.current.y);
      ctx.stroke();

      const dx = rocket.end.x - rocket.start.x;
      const dy = rocket.end.y - rocket.start.y;
      const angle = Math.atan2(dy, dx);
      
      ctx.save();
      ctx.translate(rocket.current.x, rocket.current.y);
      ctx.rotate(angle);
      ctx.fillStyle = COLORS.rocket;
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-8, -6);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // Draw Player Missiles
    stateRef.current.playerMissiles.forEach(missile => {
      ctx.strokeStyle = 'rgba(255,77,77,0.3)';
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(missile.start.x, missile.start.y);
      ctx.lineTo(missile.current.x, missile.current.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const dx = missile.target.x - missile.start.x;
      const dy = missile.target.y - missile.start.y;
      const angle = Math.atan2(dy, dx);

      ctx.save();
      ctx.translate(missile.current.x, missile.current.y);
      ctx.rotate(angle);
      ctx.fillStyle = COLORS.missile;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-10, -7);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-10, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Target X
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(missile.target.x - 5, missile.target.y - 5);
      ctx.lineTo(missile.target.x + 5, missile.target.y + 5);
      ctx.moveTo(missile.target.x + 5, missile.target.y - 5);
      ctx.lineTo(missile.target.x - 5, missile.target.y + 5);
      ctx.stroke();
    });

    // Draw Explosions
    stateRef.current.explosions.forEach(explosion => {
      const gradient = ctx.createRadialGradient(
        explosion.x, explosion.y, 0,
        explosion.x, explosion.y, explosion.radius
      );
      gradient.addColorStop(0, '#fff');
      gradient.addColorStop(0.3, COLORS.explosion);
      gradient.addColorStop(0.7, COLORS.rocket);
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
    requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const animationId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationId);
  }, [draw]);

  const startGame = () => {
    stateRef.current = {
      score: 0,
      cities: INITIAL_CITIES.map(c => ({ ...c })),
      batteries: INITIAL_BATTERIES.map(b => ({ ...b })),
      rockets: [],
      playerMissiles: [],
      explosions: [],
      status: 'playing',
      level: 1,
      rocketsSpawnedInWave: 0,
      totalRocketsInWave: 10,
    };
    nextRocketTimeRef.current = 0;
    onStateChange({ ...stateRef.current });
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        className="max-w-full max-h-full object-contain cursor-crosshair touch-none"
        onMouseDown={handleCanvasClick}
        onTouchStart={(e) => {
          e.preventDefault();
          handleCanvasClick(e);
        }}
      />

      {stateRef.current.status === 'idle' && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white p-8">
          <h1 className="text-5xl font-bold mb-4 tracking-tighter text-cyan-400">VICTOR EARTH DEFENSE</h1>
          <p className="text-lg mb-8 text-center max-w-md opacity-80">
            {language === 'en' 
              ? 'Defend Earth\'s cities from incoming rockets. Aim ahead of your targets.' 
              : '保护地球城市免受火箭袭击。请预判飞行路径瞄准目标。'}
          </p>
          <button 
            onClick={startGame}
            className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-full font-bold text-xl transition-all hover:scale-105 active:scale-95"
          >
            {language === 'en' ? 'START MISSION' : '开始任务'}
          </button>
        </div>
      )}

      {stateRef.current.status === 'between_waves' && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white p-8 animate-in fade-in zoom-in duration-300">
          <h2 className="text-5xl font-black mb-2 text-cyan-400 italic font-mono uppercase">
            {language === 'en' ? `COMMAND WAVE ${stateRef.current.level} CLEAR` : `第 ${stateRef.current.level} 轮防御成功`}
          </h2>
          <div className="flex gap-8 mb-8 mt-4">
            <div className="text-center">
               <p className="text-gray-500 text-[10px] tracking-widest uppercase">{language === 'en' ? 'Missile Bonus' : '导弹奖励'}</p>
               <p className="text-2xl font-bold font-mono text-cyan-300">REPLENISHED</p>
            </div>
          </div>
          <button 
            onClick={startNextWave}
            className="px-10 py-4 bg-cyan-600 hover:bg-cyan-500 rounded-full font-bold text-xl transition-all hover:scale-105 active:scale-95"
          >
            {language === 'en' ? 'CONTINUE DEFENSE' : '继续防御'}
          </button>
        </div>
      )}

      {stateRef.current.status === 'won' && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white p-8 animate-in fade-in zoom-in duration-300">
          <h2 className="text-6xl font-black mb-2 text-green-400 italic">VICTORY</h2>
          <p className="text-2xl mb-8 font-mono">{language === 'en' ? 'EARTH IS SAVED' : '地球已获救'}</p>
          <div className="bg-white/10 p-6 rounded-2xl mb-8 border border-white/20">
            <p className="text-gray-400 uppercase text-xs tracking-widest mb-1">{language === 'en' ? 'Final Score' : '最终得分'}</p>
            <p className="text-4xl font-bold font-mono">{stateRef.current.score}</p>
          </div>
          <button 
            onClick={startGame}
            className="px-10 py-4 bg-green-600 hover:bg-green-500 rounded-full font-bold text-xl transition-all hover:scale-105"
          >
            {language === 'en' ? 'PLAY AGAIN' : '再玩一次'}
          </button>
        </div>
      )}

      {stateRef.current.status === 'lost' && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white p-8 animate-in fade-in zoom-in duration-300">
          <h2 className="text-6xl font-black mb-2 text-red-500 italic">DEFEATED</h2>
          <p className="text-2xl mb-8 font-mono">{language === 'en' ? 'ALL DEFENSES DESTROYED' : '所有防御已被摧毁'}</p>
          <div className="bg-white/10 p-6 rounded-2xl mb-8 border border-white/20">
            <p className="text-gray-400 uppercase text-xs tracking-widest mb-1">{language === 'en' ? 'Final Score' : '最终得分'}</p>
            <p className="text-4xl font-bold font-mono text-red-400">{stateRef.current.score}</p>
          </div>
          <button 
            onClick={startGame}
            className="px-10 py-4 bg-red-600 hover:bg-red-500 rounded-full font-bold text-xl transition-all hover:scale-105"
          >
            {language === 'en' ? 'TRY AGAIN' : '重试'}
          </button>
        </div>
      )}
    </div>
  );
};
