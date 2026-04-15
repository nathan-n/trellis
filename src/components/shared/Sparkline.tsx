interface SparklineProps {
  values: number[];
  markers?: boolean[];
  width?: number;
  height?: number;
  min?: number;
  max?: number;
  lineColor?: string;
  markerColor?: string;
}

export default function Sparkline({
  values,
  markers,
  width = 120,
  height = 32,
  min = 1,
  max = 5,
  lineColor = '#5C6BC0',
  markerColor = '#D32F2F',
}: SparklineProps) {
  if (values.length < 2) return null;

  const padding = 4;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * innerW;
    const y = padding + innerH - ((v - min) / range) * innerH;
    return { x, y };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={polyline}
        fill="none"
        stroke={lineColor}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Data point dots */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={markers?.[i] ? 3.5 : 2}
          fill={markers?.[i] ? markerColor : lineColor}
          stroke={markers?.[i] ? markerColor : 'none'}
          strokeWidth={markers?.[i] ? 1 : 0}
        />
      ))}
    </svg>
  );
}
