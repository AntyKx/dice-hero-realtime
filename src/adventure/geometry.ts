import type { AdventureRect } from './adventureTypes'

export function pointInRect(x: number, y: number, r: AdventureRect): boolean {
  return x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height
}

export function rectsOverlap(a: AdventureRect, b: AdventureRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

export function rectCenter(r: AdventureRect): { x: number; y: number } {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
}

export function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x1 - x2, y1 - y2)
}
