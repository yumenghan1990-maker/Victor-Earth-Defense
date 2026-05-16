export interface Point {
  x: number;
  y: number;
}

export interface Rocket {
  id: string;
  start: Point;
  end: Point;
  current: Point;
  speed: number;
  progress: number;
}

export interface PlayerMissile {
  id: string;
  batteryIndex: number;
  start: Point;
  target: Point;
  current: Point;
  speed: number;
  progress: number;
}

export interface Explosion {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  growthRate: number;
  state: 'growing' | 'shrinking';
}

export interface City {
  id: number;
  x: number;
  alive: boolean;
}

export interface Battery {
  id: number;
  x: number;
  missiles: number;
  maxMissiles: number;
  alive: boolean;
}

export interface GameState {
  score: number;
  cities: City[];
  batteries: Battery[];
  rockets: Rocket[];
  playerMissiles: PlayerMissile[];
  explosions: Explosion[];
  status: 'idle' | 'playing' | 'won' | 'lost' | 'between_waves';
  level: number;
  rocketsSpawnedInWave: number;
  totalRocketsInWave: number;
}
