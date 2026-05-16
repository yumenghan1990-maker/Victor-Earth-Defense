export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const ROCKET_SPEED_BASE = 0.5;
export const MISSILE_SPEED = 4;
export const EXPLOSION_MAX_RADIUS = 35;
export const EXPLOSION_GROWTH_RATE = 1.2;

export const POINTS_PER_ROCKET = 20;
export const WIN_SCORE = 1000;

export const INITIAL_BATTERIES = [
  { id: 0, x: 40, missiles: 20, maxMissiles: 20, alive: true },
  { id: 1, x: 400, missiles: 40, maxMissiles: 40, alive: true },
  { id: 2, x: 760, missiles: 20, maxMissiles: 20, alive: true },
];

export const INITIAL_CITIES = [
  { id: 0, x: 130, alive: true },
  { id: 1, x: 220, alive: true },
  { id: 2, x: 310, alive: true },
  { id: 3, x: 490, alive: true },
  { id: 4, x: 580, alive: true },
  { id: 5, x: 670, alive: true },
];

export const COLORS = {
  background: '#1a1a2e',
  ground: '#2d3436',
  city: '#4ecca3',
  battery: '#45b7d1',
  rocket: '#000000', // Black Fighters (Enemy)
  missile: '#ff4d4d', // Red Fighters (Player)
  explosion: '#ffcc00',
  text: '#ffffff',
  uiPrimary: '#00d2ff',
};
