import { Point } from '../types';

export const getDistance = (p1: Point, p2: Point) => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const lerp = (start: number, end: number, t: number) => {
  return start * (1 - t) + end * t;
};

export const getPointOnLine = (start: Point, end: Point, t: number): Point => {
  return {
    x: lerp(start.x, end.x, t),
    y: lerp(start.y, end.y, t),
  };
};

export const isPointInCircle = (px: number, py: number, cx: number, cy: number, radius: number) => {
  const dist = Math.sqrt(Math.pow(px - cx, 2) + Math.pow(py - cy, 2));
  return dist <= radius;
};
