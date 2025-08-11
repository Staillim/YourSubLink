/**
 * FASE 3: HOOK PARA MANEJO DE DATOS DE GRÁFICOS
 * 
 * Hook personalizado para optimizar el manejo de datos
 * de gráficos con cache, filtros y transformaciones
 */

import { useMemo, useState, useCallback, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, getMonth, getYear, subDays, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

// ===== TIPOS =====

export interface ChartDataPoint {
  name: string;
  value: number;
  label?: string;
  color?: string;
  [key: string]: any;
}

export interface TimeSeriesData {
  timestamp: number;
  value: number;
  metadata?: Record<string, any>;
}

export type ChartType = 'bar' | 'line' | 'pie' | 'area';

export type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface ChartOptions {
  type: ChartType;
  period?: TimePeriod;
  limit?: number;
  colors?: string[];
  animate?: boolean;
}

export interface UseChartDataOptions {
  cache?: boolean;
  debounceMs?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// ===== UTILIDADES =====

/**
 * Procesa datos de serie temporal para diferentes períodos
 */
const processTimeSeriesData = (
  data: TimeSeriesData[], 
  period: TimePeriod = 'daily'
): ChartDataPoint[] => {
  if (!data || data.length === 0) return [];

  const now = new Date();
  let processedData: ChartDataPoint[] = [];

  switch (period) {
    case 'daily':
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);
      const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

      processedData = daysInWeek.map(day => ({
        name: format(day, 'EEE', { locale: es }),
        value: 0,
        label: format(day, 'dd/MM', { locale: es })
      }));

      data.forEach(item => {
        const itemDate = new Date(item.timestamp * 1000);
        if (itemDate >= weekStart && itemDate <= weekEnd) {
          const dayName = format(itemDate, 'EEE', { locale: es });
          const dayData = processedData.find(d => d.name === dayName);
          if (dayData) {
            dayData.value += item.value;
          }
        }
      });
      break;

    case 'weekly':
      // Últimas 8 semanas
      const weeks = [];
      for (let i = 7; i >= 0; i--) {
        const weekDate = subDays(now, i * 7);
        const weekStart = startOfWeek(weekDate);
        const weekEnd = endOfWeek(weekDate);
        
        weeks.push({
          name: `Sem ${format(weekStart, 'dd/MM')}`,
          value: 0,
          start: weekStart,
          end: weekEnd
        });
      }

      processedData = weeks.map(week => {
        const weekValue = data
          .filter(item => {
            const itemDate = new Date(item.timestamp * 1000);
            return itemDate >= week.start && itemDate <= week.end;
          })
          .reduce((sum, item) => sum + item.value, 0);

        return {
          name: week.name,
          value: weekValue,
          label: `${format(week.start, 'dd/MM')} - ${format(week.end, 'dd/MM')}`
        };
      });
      break;

    case 'monthly':
      // Últimos 12 meses
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          name: format(monthDate, 'MMM', { locale: es }),
          value: 0,
          month: monthDate.getMonth(),
          year: monthDate.getFullYear()
        });
      }

      processedData = months.map(month => {
        const monthValue = data
          .filter(item => {
            const itemDate = new Date(item.timestamp * 1000);
            return itemDate.getMonth() === month.month && 
                   itemDate.getFullYear() === month.year;
          })
          .reduce((sum, item) => sum + item.value, 0);

        return {
          name: month.name,
          value: monthValue,
          label: `${month.name} ${month.year}`
        };
      });
      break;

    case 'yearly':
      // Últimos 5 años
      const years = [];
      for (let i = 4; i >= 0; i--) {
        const year = now.getFullYear() - i;
        years.push({ year, name: year.toString(), value: 0 });
      }

      processedData = years.map(year => {
        const yearValue = data
          .filter(item => {
            const itemDate = new Date(item.timestamp * 1000);
            return itemDate.getFullYear() === year.year;
          })
          .reduce((sum, item) => sum + item.value, 0);

        return {
          name: year.name,
          value: yearValue,
          label: `Año ${year.year}`
        };
      });
      break;
  }

  return processedData;
};

/**
 * Agrega colores a los datos del gráfico
 */
const addColorsToData = (data: ChartDataPoint[], colors: string[]): ChartDataPoint[] => {
  return data.map((item, index) => ({
    ...item,
    color: colors[index % colors.length]
  }));
};

/**
 * Calcula estadísticas agregadas de los datos
 */
const calculateStats = (data: ChartDataPoint[]) => {
  if (!data || data.length === 0) {
    return {
      total: 0,
      average: 0,
      max: 0,
      min: 0,
      growth: 0
    };
  }

  const values = data.map(item => item.value);
  const total = values.reduce((sum, val) => sum + val, 0);
  const average = total / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);
  
  // Calcular crecimiento (último vs anterior)
  const growth = values.length >= 2 
    ? ((values[values.length - 1] - values[values.length - 2]) / values[values.length - 2]) * 100
    : 0;

  return {
    total,
    average: Number(average.toFixed(2)),
    max,
    min,
    growth: Number(growth.toFixed(2))
  };
};

// ===== HOOK PRINCIPAL =====

/**
 * Hook personalizado para manejo optimizado de datos de gráficos
 */
export const useChartData = (
  rawData: any[],
  options: ChartOptions,
  hookOptions: UseChartDataOptions = {}
) => {
  const {
    cache = true,
    debounceMs = 300,
    autoRefresh = false,
    refreshInterval = 30000 // 30 segundos
  } = hookOptions;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Cache simple para datos procesados
  const [dataCache, setDataCache] = useState<Map<string, ChartDataPoint[]>>(new Map());

  // Generar clave de cache basada en opciones
  const cacheKey = useMemo(() => {
    return JSON.stringify({
      dataLength: rawData?.length || 0,
      type: options.type,
      period: options.period,
      limit: options.limit
    });
  }, [rawData, options]);

  // Procesar datos con memoización
  const processedData = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];

    // Verificar cache si está habilitado
    if (cache && dataCache.has(cacheKey)) {
      return dataCache.get(cacheKey)!;
    }

    setIsLoading(true);
    setError(null);

    try {
      let processed: ChartDataPoint[] = [];

      // Determinar tipo de procesamiento
      if (options.period && rawData[0]?.timestamp) {
        // Datos de serie temporal
        processed = processTimeSeriesData(rawData as TimeSeriesData[], options.period);
      } else {
        // Datos directos
        processed = rawData.map((item, index) => ({
          name: item.name || item.label || `Item ${index + 1}`,
          value: typeof item.value === 'number' ? item.value : item.total || item.count || 0,
          label: item.label || item.name,
          ...item
        }));
      }

      // Aplicar límite si está especificado
      if (options.limit && processed.length > options.limit) {
        processed = processed.slice(0, options.limit);
      }

      // Agregar colores si están especificados
      if (options.colors && options.colors.length > 0) {
        processed = addColorsToData(processed, options.colors);
      }

      // Guardar en cache
      if (cache) {
        setDataCache(prev => new Map(prev).set(cacheKey, processed));
      }

      setLastUpdated(new Date());
      return processed;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing chart data');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [rawData, options, cacheKey, cache, dataCache]);

  // Estadísticas calculadas
  const stats = useMemo(() => calculateStats(processedData), [processedData]);

  // Auto-refresh si está habilitado
  useEffect(() => {
    if (!autoRefresh || !refreshInterval) return;

    const interval = setInterval(() => {
      setLastUpdated(new Date());
      // Limpiar cache para forzar recalculo
      if (cache) {
        setDataCache(new Map());
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, cache]);

  // Función para refrescar manualmente
  const refresh = useCallback(() => {
    if (cache) {
      setDataCache(new Map());
    }
    setLastUpdated(new Date());
  }, [cache]);

  // Función para limpiar cache
  const clearCache = useCallback(() => {
    setDataCache(new Map());
  }, []);

  return {
    data: processedData,
    stats,
    isLoading,
    error,
    lastUpdated,
    refresh,
    clearCache,
    cacheSize: dataCache.size
  };
};

// ===== HOOKS ESPECIALIZADOS =====

/**
 * Hook especializado para gráficos de clicks
 */
export const useClicksChartData = (
  clicksData: TimeSeriesData[],
  period: TimePeriod = 'daily'
) => {
  return useChartData(
    clicksData,
    {
      type: 'bar',
      period,
      colors: ['hsl(var(--primary))', 'hsl(var(--secondary))']
    },
    {
      cache: true,
      autoRefresh: true,
      refreshInterval: 60000 // 1 minuto
    }
  );
};

/**
 * Hook especializado para gráficos de earnings
 */
export const useEarningsChartData = (
  earningsData: TimeSeriesData[],
  period: TimePeriod = 'monthly'
) => {
  return useChartData(
    earningsData,
    {
      type: 'line',
      period,
      colors: ['#10b981', '#3b82f6']
    },
    {
      cache: true,
      autoRefresh: true,
      refreshInterval: 300000 // 5 minutos
    }
  );
};

/**
 * Hook especializado para gráficos de sponsors
 */
export const useSponsorChartData = (sponsorsData: any[]) => {
  return useChartData(
    sponsorsData,
    {
      type: 'pie',
      colors: ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
    },
    {
      cache: true
    }
  );
};

// ===== EXPORTS =====

export default useChartData;
