'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomTooltip, useTooltipConfig } from './enhanced-tooltips';
import {
  PieChartData,
  LineChartData,
  BarChartData,
  AreaChartData,
  CHART_COLORS,
  formatChartNumber
} from './chart-data-processors';

// Props para cada tipo de gráfico
interface SponsorStatusPieChartProps {
  data: PieChartData[];
  totalSponsors: number;
}

interface ConversionTrendLineChartProps {
  data: LineChartData[];
  averageConversion: number;
}

interface SponsorComparisonBarChartProps {
  data: BarChartData[];
  showClicks?: boolean;
  showViews?: boolean;
}

interface SponsorEvolutionAreaChartProps {
  data: AreaChartData[];
  showPercentage?: boolean;
}

/**
 * Gráfico de pie para mostrar distribución de estados de sponsors
 */
export function SponsorStatusPieChart({ data, totalSponsors }: SponsorStatusPieChartProps) {
  const tooltipConfig = useTooltipConfig('sponsors', {
    showTotal: true,
    customFormatters: {
      value: (value: number) => `${value} sponsors`,
      label: (label: string) => label
    }
  });

  const renderCustomLabel = (entry: PieChartData) => {
    const percentage = totalSponsors > 0 ? ((entry.value / totalSponsors) * 100).toFixed(1) : '0';
    return `${percentage}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          Distribución de Estados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <RechartsTooltip
                content={<CustomTooltip config={tooltipConfig} totalData={totalSponsors} />}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Resumen estadístico */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          {data.map((item, index) => (
            <div key={index} className="space-y-1">
              <div 
                className="w-3 h-3 rounded-full mx-auto"
                style={{ backgroundColor: item.fill }}
              ></div>
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Gráfico de línea para mostrar tendencia de conversión
 */
export function ConversionTrendLineChart({ data, averageConversion }: ConversionTrendLineChartProps) {
  const tooltipConfig = useTooltipConfig('conversion', {
    customFormatters: {
      value: (value: number) => `${value}%`,
      label: (label: string) => `Fecha: ${label}`
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          Tendencia de Conversión
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis 
                tickFormatter={(value) => `${value}%`}
                tick={{ fontSize: 12 }}
              />
              <RechartsTooltip
                content={<CustomTooltip config={tooltipConfig} />}
              />
              <Line
                type="monotone"
                dataKey="conversionRate"
                stroke={CHART_COLORS.active}
                strokeWidth={2}
                dot={{ fill: CHART_COLORS.active, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: CHART_COLORS.active, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Estadística de promedio */}
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">Conversión promedio</p>
          <p className="text-lg font-bold" style={{ color: CHART_COLORS.active }}>
            {formatChartNumber(averageConversion, 'percentage')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Gráfico de barras para comparar sponsors (views vs clicks)
 */
export function SponsorComparisonBarChart({ 
  data, 
  showClicks = true, 
  showViews = true 
}: SponsorComparisonBarChartProps) {
  const tooltipConfig = useTooltipConfig('views', {
    showTotal: false,
    customFormatters: {
      value: (value: number) => formatChartNumber(value),
      label: (label: string) => {
        const sponsor = data.find(d => d.sponsor === label);
        return sponsor ? sponsor.title : label;
      }
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
          Top Sponsors - Comparación
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="sponsor" 
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <RechartsTooltip
                content={<CustomTooltip config={tooltipConfig} />}
              />
              <Legend />
              
              {showViews && (
                <Bar 
                  dataKey="views" 
                  fill={CHART_COLORS.primary}
                  name="Views"
                  radius={[0, 0, 4, 4]}
                />
              )}
              
              {showClicks && (
                <Bar 
                  dataKey="clicks" 
                  fill={CHART_COLORS.active}
                  name="Clicks"
                  radius={[4, 4, 0, 0]}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Resumen de mejores performers */}
        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-2">Mejores performers:</p>
          <div className="space-y-1">
            {data.slice(0, 3).map((sponsor, index) => (
              <div key={sponsor.sponsor} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  {sponsor.title}
                </span>
                <span className="font-mono">
                  {formatChartNumber(sponsor.conversionRate, 'percentage')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Gráfico de área para mostrar evolución de sponsors activos
 */
export function SponsorEvolutionAreaChart({ 
  data, 
  showPercentage = false 
}: SponsorEvolutionAreaChartProps) {
  const tooltipConfig = useTooltipConfig('sponsors', {
    showTotal: false,
    customFormatters: {
      value: (value: number) => formatChartNumber(value),
      label: (label: string) => `Fecha: ${label}`
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          Evolución Temporal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <RechartsTooltip
                content={<CustomTooltip config={tooltipConfig} />}
              />
              
              <Area
                type="monotone"
                dataKey="total"
                stackId="1"
                stroke={CHART_COLORS.inactive}
                fill={CHART_COLORS.inactive}
                fillOpacity={0.3}
                name="Total Sponsors"
              />
              
              <Area
                type="monotone"
                dataKey="active"
                stackId="2"
                stroke={CHART_COLORS.active}
                fill={CHART_COLORS.active}
                fillOpacity={0.6}
                name="Sponsors Activos"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Estadísticas de crecimiento */}
        <div className="mt-4 grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground">Crecimiento Total</p>
            <p className="text-lg font-bold text-blue-600">
              +{formatChartNumber(data[data.length - 1]?.total || 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tasa de Actividad</p>
            <p className="text-lg font-bold text-green-600">
              {formatChartNumber(data[data.length - 1]?.percentage || 0, 'percentage')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Componente contenedor para todos los gráficos del dashboard
 */
export function SponsorChartsContainer({
  pieData,
  lineData,
  barData,
  areaData,
  totalSponsors,
  averageConversion
}: {
  pieData: PieChartData[];
  lineData: LineChartData[];
  barData: BarChartData[];
  areaData: AreaChartData[];
  totalSponsors: number;
  averageConversion: number;
}) {
  return (
    <div className="space-y-6">
      {/* Fila superior: Pie Chart + Line Chart */}
      <div className="grid gap-6 md:grid-cols-2">
        <SponsorStatusPieChart 
          data={pieData} 
          totalSponsors={totalSponsors}
        />
        <ConversionTrendLineChart 
          data={lineData} 
          averageConversion={averageConversion}
        />
      </div>
      
      {/* Fila inferior: Bar Chart + Area Chart */}
      <div className="grid gap-6 md:grid-cols-2">
        <SponsorComparisonBarChart 
          data={barData}
          showClicks={true}
          showViews={true}
        />
        <SponsorEvolutionAreaChart 
          data={areaData}
          showPercentage={true}
        />
      </div>
    </div>
  );
}
