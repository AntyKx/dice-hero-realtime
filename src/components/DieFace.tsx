// Renders a real-dice pip face for values 1-6 using SVG.
// Uses a 90×90 viewBox; the parent .die container controls actual pixel size.

const PIPS: Record<number, [number, number][]> = {
  1: [[45, 45]],
  2: [[23, 23], [67, 67]],
  3: [[23, 23], [45, 45], [67, 67]],
  4: [[23, 23], [67, 23], [23, 67], [67, 67]],
  5: [[23, 23], [67, 23], [45, 45], [23, 67], [67, 67]],
  6: [[23, 23], [67, 23], [23, 45], [67, 45], [23, 67], [67, 67]],
}

export default function DieFace({ value }: { value: number }) {
  const pips = PIPS[Math.min(6, Math.max(1, value))] ?? PIPS[1]
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 90 90"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', pointerEvents: 'none' }}
    >
      {pips.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={8} fill="currentColor" />
      ))}
    </svg>
  )
}
