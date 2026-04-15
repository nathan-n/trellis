interface SparklineProps {
  values: number[];
  markers?: boolean[];
  width?: number;
  height?: number;
  min?: number;
  max?: number;
  lineColor?: string;
  markerColor?: string;
  showYAxis?: boolean;
  maxPoints?: number;
}

export default function Sparkline({
  values,
  markers,
  width = 140,
  height = 48,
  min = 1,
  max = 5,
  lineColor = '#5C6BC0',
  markerColor = '#D32F2F',
  showYAxis = true,
  maxPoints = 8,
}: SparklineProps) {
  // Cap to most recent N points
  const cappedValues = values.slice(-maxPoints);
  const cappedMarkers = markers?.slice(-maxPoints);

  if (cappedValues.length < 2) return null;

  const yAxisWidth = showYAxis ? 16 : 0;
  const padding = 6;
  const innerW = width - padding * 2 - yAxisWidth;
  const innerH = height - padding * 2;
  const range = max - min || 1;
  const steps = max - min; // e.g. 4 steps for 1-5

  const toY = (v: number) => padding + innerH - ((v - min) / range) * innerH;
  const toX = (i: number) => yAxisWidth + padding + (i / (cappedValues.length - 1)) * innerW;

  const points = cappedValues.map((v, i) => ({ x: toX(i), y: toY(v) }));
  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {/* Y-axis reference lines and labels */}
      {showYAxis && Array.from({ length: steps + 1 }, (_, i) => {
        const val = min + i;
        const y = toY(val);
        return (
          <g key={val}>
            {/* Horizontal reference line */}
            <line
              x1={yAxisWidth + padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="#e0e0e0"
              strokeWidth={0.5}
              strokeDasharray={val === min || val === max ? 'none' : '2,2'}
            />
            {/* Y-axis label */}
            <text
              x={yAxisWidth - 2}
              y={y + 3}
              textAnchor="end"
              fontSize={8}
              fill="#999"
            >
              {val}
            </text>
          </g>
        );
      })}

      {/* Data line */}
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
          r={cappedMarkers?.[i] ? 3.5 : 2}
          fill={cappedMarkers?.[i] ? markerColor : lineColor}
          stroke={cappedMarkers?.[i] ? markerColor : 'none'}
          strokeWidth={cappedMarkers?.[i] ? 1 : 0}
        />
      ))}
    </svg>
  );
}
