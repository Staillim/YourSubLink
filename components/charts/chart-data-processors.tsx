'use client';

import { SponsorRule, isSponsorExpired } from '../../types';
import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

// Tipos para los datos procesados de gráficos
export interface PieChartData {
  name: string;
  value: number;
  fill: string;
}

export interface LineChartData {
  date: string;
  conversionRate: number;
  totalViews: number;
  totalClicks: number;
}

export interface BarChartData {
  sponsor: string;
  views: number;
  clicks: number;
  conversionRate: number;
  title: string;
}

export interface AreaChartData {
  date: string;
  active: number;
  total: number;
  percentage: number;
}

// Colores para los gráficos
export const CHART_COLORS = {
  active: '#22c55e', // green-500
  inactive: '#6b7280', // gray-500
  expired: '#ef4444', // red-500
  expiring: '#f59e0b', // amber-500
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  muted: 'hsl(var(--muted))',
} as const;

/**
 * Procesa datos de sponsors para gráfico de pie (distribución de estados)
 */
export function processPieChartData(sponsors: SponsorRule[]): PieChartData[] {
  const active = sponsors.filter(s => s.isActive && !isSponsorExpired(s)).length;
  const inactive = sponsors.filter(s => !s.isActive).length;
  const expired = sponsors.filter(s => isSponsorExpired(s)).length;

  return [
    {
      name: 'Activos',
      value: active,
      fill: CHART_COLORS.active
    },
    {
      name: 'Inactivos', 
      value: inactive,
      fill: CHART_COLORS.inactive
    },
    {
      name: 'Expirados',
      value: expired,
      fill: CHART_COLORS.expired
    }
  ].filter(item => item.value > 0); // Solo mostrar categorías con datos
}

/**
 * Procesa datos para gráfico de línea (tendencia de conversión)
 * Simula datos históricos basados en datos actuales
 */
export function processLineChartData(sponsors: SponsorRule[]): LineChartData[] {
  // Generar datos para los últimos 30 días
  const days = eachDayOfInterval({
    start: subDays(new Date(), 29),
    end: new Date()
  });

  return days.map(day => {
    // Simular variación en los datos históricos
    const dayVariation = Math.sin(day.getTime() / (1000 * 60 * 60 * 24)) * 0.1 + 1;
    
    const totalViews = Math.round(
      sponsors.reduce((sum, s) => sum + (s.views || 0), 0) * dayVariation * 0.03
    );
    
    const totalClicks = Math.round(
      sponsors.reduce((sum, s) => sum + (s.clicks || 0), 0) * dayVariation * 0.03
    );

    const conversionRate = totalViews > 0 ? 
      Math.round((totalClicks / totalViews) * 100 * 100) / 100 : 0;

    return {
      date: format(day, 'dd/MM', { locale: es }),
      conversionRate,
      totalViews,
      totalClicks
    };
  });
}

/**
 * Procesa datos para gráfico de barras (comparación sponsors top 10)
 */
export function processBarChartData(sponsors: SponsorRule[]): BarChartData[] {
  return sponsors
    .filter(s => s.isActive && !isSponsorExpired(s))
    .map(sponsor => {
      const views = sponsor.views || 0;
      const clicks = sponsor.clicks || 0;
      const conversionRate = views > 0 ? (clicks / views) * 100 : 0;

      return {
        sponsor: sponsor.id || 'unknown',
        title: sponsor.title,
        views,
        clicks,
        conversionRate: Math.round(conversionRate * 100) / 100
      };
    })
    .sort((a, b) => (b.views + b.clicks) - (a.views + a.clicks)) // Ordenar por actividad total
    .slice(0, 10); // Top 10
}

/**
 * Procesa datos para gráfico de área (evolución temporal de sponsors)
 */
export function processAreaChartData(sponsors: SponsorRule[]): AreaChartData[] {
  // Generar datos para los últimos 30 días
  const days = eachDayOfInterval({
    start: subDays(new Date(), 29),
    end: new Date()
  });

  return days.map((day, index) => {
    // Simular crecimiento gradual de sponsors
    const growthFactor = (index + 1) / days.length;
    const total = Math.round(sponsors.length * growthFactor);
    const active = Math.round(
      sponsors.filter(s => s.isActive && !isSponsorExpired(s)).length * growthFactor
    );

    const percentage = total > 0 ? Math.round((active / total) * 100) : 0;

    return {
      date: format(day, 'dd/MM', { locale: es }),
      active,
      total,
      percentage
    };
  });
}

/**
 * Calcula estadísticas resumen para mostrar en los gráficos
 */
export function calculateSummaryStats(sponsors: SponsorRule[]) {
  const total = sponsors.length;
  const active = sponsors.filter(s => s.isActive && !isSponsorExpired(s)).length;
  const inactive = sponsors.filter(s => !s.isActive).length;
  const expired = sponsors.filter(s => isSponsorExpired(s)).length;
  
  const totalViews = sponsors.reduce((sum, s) => sum + (s.views || 0), 0);
  const totalClicks = sponsors.reduce((sum, s) => sum + (s.clicks || 0), 0);
  const overallConversion = totalViews > 0 ? 
    Math.round((totalClicks / totalViews) * 100 * 100) / 100 : 0;

  // Calcular tendencias (simuladas)
  const conversionTrend = Math.random() > 0.5 ? 
    '+' + (Math.random() * 5).toFixed(1) : 
    '-' + (Math.random() * 3).toFixed(1);

  return {
    total,
    active,
    inactive, 
    expired,
    totalViews,
    totalClicks,
    overallConversion,
    conversionTrend,
    activePercentage: total > 0 ? Math.round((active / total) * 100) : 0
  };
}

/**
 * Obtiene el color apropiado basado en el valor y el contexto
 */
export function getChartColor(
  value: number, 
  context: 'conversion' | 'trend' | 'status' = 'conversion'
): string {
  switch (context) {
    case 'conversion':
      if (value >= 5) return CHART_COLORS.active;
      if (value >= 2) return CHART_COLORS.expiring;
      return CHART_COLORS.expired;
    
    case 'trend':
      if (value > 0) return CHART_COLORS.active;
      if (value < 0) return CHART_COLORS.expired;
      return CHART_COLORS.inactive;
    
    case 'status':
      return CHART_COLORS.primary;
    
    default:
      return CHART_COLORS.primary;
  }
}

/**
 * Formatea números para mostrar en los gráficos
 */
export function formatChartNumber(value: number, type: 'count' | 'percentage' | 'decimal' = 'count'): string {
  switch (type) {
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'decimal':
      return value.toFixed(2);
    case 'count':
    default:
      return value.toLocaleString();
  }
}
