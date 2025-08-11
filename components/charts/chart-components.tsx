/**
 * FASE 3: COMPONENTES BASE REUTILIZABLES
 * 
 * Componentes base para optimizar la reutilización de gráficos
 * en diferentes páginas del dashboard
 */

import React, { memo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  Tooltip
} from 'recharts';
import { ClicksTooltip, CustomTooltip, useTooltipConfig } from './enhanced-tooltips';

// ===== INTERFACES =====

interface BaseChartProps {
  data: any[];
  height?: number;
  colors?: string[];
  className?: string;
}

interface BarChartProps extends BaseChartProps {
  xDataKey: string;
  yDataKey: string;
  barName?: string;
  showGrid?: boolean;
}

interface LineChartProps extends BaseChartProps {
  xDataKey: string;
  yDataKey: string;
  lineName?: string;
  strokeWidth?: number;
  showDots?: boolean;
}

interface PieChartProps extends BaseChartProps {
  dataKey: string;
  nameKey: string;
  showLabels?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}

interface AreaChartProps extends BaseChartProps {
  xDataKey: string;
  yDataKey: string;
  areaName?: string;
  fillOpacity?: number;
  strokeWidth?: number;
}

// ===== COLORES DEFAULT =====

const DEFAULT_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7c7c',
  '#8dd1e1',
  '#d084d0'
];

// ===== COMPONENTES BASE =====

/**
 * Componente de Gráfico de Barras Reutilizable
 */
export const BaseBarChart = memo<BarChartProps>(({
  data,
  xDataKey,
  yDataKey,
  barName = 'Value',
  height = 300,
  colors = DEFAULT_COLORS,
  showGrid = true,
  className = ''
}) => {
  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey={xDataKey} />
          <YAxis allowDecimals={false} />
          <Tooltip content={<ClicksTooltip />} />
          <Bar 
            dataKey={yDataKey} 
            fill={colors[0]} 
            name={barName}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

BaseBarChart.displayName = 'BaseBarChart';

/**
 * Componente de Gráfico de Líneas Reutilizable
 */
export const BaseLineChart = memo<LineChartProps>(({
  data,
  xDataKey,
  yDataKey,
  lineName = 'Value',
  height = 300,
  colors = DEFAULT_COLORS,
  strokeWidth = 2,
  showDots = true,
  className = ''
}) => {
  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xDataKey} />
          <YAxis allowDecimals={false} />
          <Tooltip content={<ClicksTooltip />} />
          <Line 
            type="monotone" 
            dataKey={yDataKey} 
            stroke={colors[0]} 
            strokeWidth={strokeWidth}
            name={lineName}
            dot={showDots}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

BaseLineChart.displayName = 'BaseLineChart';

/**
 * Componente de Gráfico Circular Reutilizable
 */
export const BasePieChart = memo<PieChartProps>(({
  data,
  dataKey,
  nameKey,
  height = 300,
  colors = DEFAULT_COLORS,
  showLabels = false,
  innerRadius = 0,
  outerRadius = 80,
  className = ''
}) => {
  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={showLabels ? ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%` : false}
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            fill="#8884d8"
            dataKey={dataKey}
            nameKey={nameKey}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip content={<ClicksTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});

BasePieChart.displayName = 'BasePieChart';

/**
 * Componente de Gráfico de Área Reutilizable
 */
export const BaseAreaChart = memo<AreaChartProps>(({
  data,
  xDataKey,
  yDataKey,
  areaName = 'Value',
  height = 300,
  colors = DEFAULT_COLORS,
  fillOpacity = 0.6,
  strokeWidth = 2,
  className = ''
}) => {
  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xDataKey} />
          <YAxis allowDecimals={false} />
          <Tooltip content={<ClicksTooltip />} />
          <Area 
            type="monotone" 
            dataKey={yDataKey} 
            stroke={colors[0]} 
            strokeWidth={strokeWidth}
            fill={colors[0]}
            fillOpacity={fillOpacity}
            name={areaName}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

BaseAreaChart.displayName = 'BaseAreaChart';

// ===== UTILIDADES DE OPTIMIZACIÓN =====

/**
 * Hook para optimizar renders de gráficos
 */
export const useChartOptimization = (data: any[], dependencies: any[] = []) => {
  const optimizedData = React.useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    // Limitar datos para mejor performance (máximo 100 puntos)
    if (data.length > 100) {
      const step = Math.ceil(data.length / 100);
      return data.filter((_, index) => index % step === 0);
    }
    
    return data;
  }, [data, ...dependencies]);

  return optimizedData;
};

/**
 * Componente wrapper para lazy loading de gráficos
 */
export const LazyChart: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
}> = ({ 
  children, 
  fallback = <div className="h-64 bg-gray-100 rounded animate-pulse" />,
  threshold = 0.1 
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div ref={ref}>
      {isVisible ? children : fallback}
    </div>
  );
};

// ===== EXPORTS =====

export {
  BaseBarChart as BarChart,
  BaseLineChart as LineChart,
  BasePieChart as PieChart,
  BaseAreaChart as AreaChart
};

export type {
  BarChartProps,
  LineChartProps,
  PieChartProps,
  AreaChartProps,
  BaseChartProps
};
