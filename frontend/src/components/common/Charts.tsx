import { motion } from "framer-motion";

interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartData[];
  height?: number;
  showValues?: boolean;
  animate?: boolean;
}

export function BarChart({
  data,
  height = 200,
  showValues = true,
  animate = true,
}: BarChartProps) {
  // Proteção para dados vazios
  if (!data || data.length === 0) {
    return (
      <div
        className="w-full flex items-center justify-center text-slate-400 text-sm"
        style={{ height }}
      >
        Sem dados disponíveis
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.min(40, (100 / data.length) * 0.6);
  const gap = (100 - barWidth * data.length) / (data.length + 1);

  return (
    <div className="w-full" style={{ height }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((y) => (
          <line
            key={y}
            x1="0"
            y1={100 - y}
            x2="100"
            y2={100 - y}
            stroke="#e2e8f0"
            strokeWidth="0.3"
            strokeDasharray={y === 0 ? "0" : "1,1"}
          />
        ))}

        {/* Bars */}
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * 85;
          const x = gap + index * (barWidth + gap);

          return (
            <motion.g key={index}>
              <motion.rect
                x={x}
                y={100 - barHeight - 10}
                width={barWidth}
                height={barHeight}
                rx="2"
                fill={item.color || "#8b5cf6"}
                initial={animate ? { scaleY: 0 } : {}}
                animate={{ scaleY: 1 }}
                transition={{
                  delay: index * 0.1,
                  duration: 0.5,
                  ease: "easeOut",
                }}
                style={{ transformOrigin: "bottom" }}
              />
              {showValues && (
                <text
                  x={x + barWidth / 2}
                  y={100 - barHeight - 13}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="4"
                  fontWeight="500"
                >
                  {item.value}
                </text>
              )}
            </motion.g>
          );
        })}
      </svg>

      {/* Labels */}
      <div className="flex justify-around mt-2">
        {data.map((item, index) => (
          <span
            key={index}
            className="text-xs text-slate-500 truncate max-w-[60px]"
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

interface LineChartData {
  label: string;
  value: number;
}

interface LineChartProps {
  data: LineChartData[];
  height?: number;
  color?: string;
  showArea?: boolean;
  animate?: boolean;
}

export function LineChart({
  data,
  height = 200,
  color = "#8b5cf6",
  showArea = true,
  animate = true,
}: LineChartProps) {
  // Proteção para dados vazios ou insuficientes
  if (!data || data.length === 0) {
    return (
      <div
        className="w-full flex items-center justify-center text-slate-400 text-sm"
        style={{ height }}
      >
        Sem dados disponíveis
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = Math.min(...data.map((d) => d.value), 0);
  const range = maxValue - minValue || 1;

  const points = data.map((item, index) => {
    const x = data.length === 1 ? 50 : (index / (data.length - 1)) * 100;
    const y = 100 - ((item.value - minValue) / range) * 80 - 10;
    return { x, y, value: item.value };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} 100 L ${
          points[0].x
        } 100 Z`
      : "";

  return (
    <div className="w-full" style={{ height }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((y) => (
          <line
            key={y}
            x1="0"
            y1={100 - y * 0.8 - 10}
            x2="100"
            y2={100 - y * 0.8 - 10}
            stroke="#e2e8f0"
            strokeWidth="0.3"
            strokeDasharray={y === 0 ? "0" : "1,1"}
          />
        ))}

        {/* Area */}
        {showArea && (
          <motion.path
            d={areaPath}
            fill={`${color}20`}
            initial={animate ? { opacity: 0 } : {}}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
        )}

        {/* Line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={animate ? { pathLength: 0 } : {}}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeInOut" }}
        />

        {/* Points */}
        {points.map((point, index) => (
          <motion.circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="2"
            fill="white"
            stroke={color}
            strokeWidth="1.5"
            initial={animate ? { scale: 0 } : {}}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 + index * 0.1 }}
          />
        ))}
      </svg>

      {/* Labels */}
      <div className="flex justify-between mt-2 px-1">
        {data.map((item, index) => (
          <span key={index} className="text-xs text-slate-500">
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

interface DonutChartData {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutChartData[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string | number;
}

export function DonutChart({
  data,
  size = 150,
  thickness = 20,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  // Pre-calculate offsets to avoid reassignment during render
  const segments = data.map((item, index) => {
    const percentage = item.value / total;
    const offset = data
      .slice(0, index)
      .reduce((sum, prev) => sum + prev.value / total, 0);
    return {
      ...item,
      percentage,
      offset,
      dashLength: circumference * percentage,
      dashOffset: circumference * offset,
    };
  });

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={thickness}
        />

        {/* Data segments */}
        {segments.map((segment, index) => (
          <motion.circle
            key={index}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={thickness}
            strokeDasharray={`${segment.dashLength} ${circumference}`}
            strokeDashoffset={-segment.dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.2, duration: 0.5 }}
          />
        ))}
      </svg>

      {/* Center text */}
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue !== undefined && (
            <span className="text-2xl font-bold text-slate-800">
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span className="text-xs text-slate-500">{centerLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

interface MiniSparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export function MiniSparkline({
  data,
  color = "#8b5cf6",
  width = 80,
  height = 30,
}: MiniSparklineProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height * 0.8 - height * 0.1;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
