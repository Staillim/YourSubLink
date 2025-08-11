'use client';

import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Tipos de datos soportados por los tooltips
export type TooltipDataType = 'clicks' | 'earnings' | 'conversion' | 'sponsors' | 'views';

// Configuración para cada tipo de tooltip
export interface TooltipConfig {
  dataType: TooltipDataType;
  formatters: {
    value: (value: number) => string;
    label: (label: string) => string;
    percentage?: (value: number, total: number) => string;
  };
  showTotal?: boolean;
  currency?: boolean;
  showChange?: boolean;
  previousValue?: number;
}

// Props para el tooltip personalizado
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  config: TooltipConfig;
  totalData?: number;
}

// Formatters predefinidos para diferentes tipos de datos
export const defaultFormatters = {
  clicks: {
    value: (value: number) => `${value.toLocaleString()} clicks`,
    label: (label: string) => {
      // Si es un día de la semana (Lun, Mar, etc)
      if (label.length <= 3) {
        return `${label}`;
      }
      // Si es un mes (Ene, Feb, etc)
      if (label.length === 3 && !label.includes('/')) {
        return `${label}`;
      }
      // Si es una fecha
      return label;
    },
    percentage: (value: number, total: number) => 
      total > 0 ? ` (${((value / total) * 100).toFixed(1)}%)` : ''
  },
  
  earnings: {
    value: (value: number) => `$${value.toFixed(4)}`,
    label: (label: string) => {
      if (label.length === 3) {
        return `${label} 2025`;
      }
      return label;
    },
    percentage: (value: number, total: number) => 
      total > 0 ? ` (${((value / total) * 100).toFixed(1)}% del total)` : ''
  },

  views: {
    value: (value: number) => `${value.toLocaleString()} views`,
    label: (label: string) => label,
    percentage: (value: number, total: number) => 
      total > 0 ? ` (${((value / total) * 100).toFixed(1)}%)` : ''
  },

  conversion: {
    value: (value: number) => `${value.toFixed(2)}%`,
    label: (label: string) => label,
    percentage: () => ''
  },

  sponsors: {
    value: (value: number) => `${value.toLocaleString()} sponsors`,
    label: (label: string) => label,
    percentage: (value: number, total: number) => 
      total > 0 ? ` (${((value / total) * 100).toFixed(1)}%)` : ''
  }
};

// Componente principal del tooltip personalizado
export function CustomTooltip({ 
  active, 
  payload, 
  label, 
  config, 
  totalData 
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0];
  const value = data.value;
  const { formatters, showTotal, showChange, previousValue } = config;

  // Calcular cambio respecto al valor anterior si está disponible
  const changePercent = showChange && previousValue !== undefined && previousValue > 0
    ? (((value - previousValue) / previousValue) * 100).toFixed(1)
    : null;

  const changeIcon = changePercent && parseFloat(changePercent) > 0 ? '↗' : 
                    changePercent && parseFloat(changePercent) < 0 ? '↘' : '';

  return (
    <div className="bg-background border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
      {/* Label principal */}
      <div className="font-medium text-foreground mb-1">
        {formatters.label(label || '')}
      </div>
      
      {/* Valor principal */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-primary">
          {formatters.value(value)}
        </span>
        
        {/* Porcentaje del total si está habilitado */}
        {showTotal && totalData && formatters.percentage && (
          <span className="text-sm text-muted-foreground">
            {formatters.percentage(value, totalData)}
          </span>
        )}
      </div>

      {/* Cambio respecto al periodo anterior */}
      {changePercent && (
        <div className={`text-sm flex items-center gap-1 mt-1 ${
          parseFloat(changePercent) > 0 ? 'text-green-600' : 
          parseFloat(changePercent) < 0 ? 'text-red-600' : 
          'text-muted-foreground'
        }`}>
          <span>{changeIcon}</span>
          <span>{Math.abs(parseFloat(changePercent))}% vs anterior</span>
        </div>
      )}

      {/* Información adicional según el tipo de datos */}
      {config.dataType === 'earnings' && data.payload?.cpm && (
        <div className="text-xs text-muted-foreground mt-1">
          CPM aplicado: ${data.payload.cpm.toFixed(4)}
        </div>
      )}

      {config.dataType === 'clicks' && data.payload?.total && (
        <div className="text-xs text-muted-foreground mt-1">
          Total acumulado: {data.payload.total.toLocaleString()}
        </div>
      )}
    </div>
  );
}

// Hook para generar configuraciones de tooltip comunes
export function useTooltipConfig(dataType: TooltipDataType, options?: {
  showTotal?: boolean;
  showChange?: boolean;
  previousValue?: number;
  customFormatters?: Partial<TooltipConfig['formatters']>;
}): TooltipConfig {
  const baseFormatters = defaultFormatters[dataType] || defaultFormatters.clicks;
  
  return {
    dataType,
    formatters: {
      ...baseFormatters,
      ...options?.customFormatters
    },
    showTotal: options?.showTotal || false,
    showChange: options?.showChange || false,
    previousValue: options?.previousValue
  };
}

// Componente de tooltip específico para datos de clicks
export function ClicksTooltip({ 
  active, 
  payload, 
  label,
  showTotal = false,
  totalData,
  showChange = false,
  previousValue
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  showTotal?: boolean;
  totalData?: number;
  showChange?: boolean;
  previousValue?: number;
}) {
  const config = useTooltipConfig('clicks', { 
    showTotal, 
    showChange, 
    previousValue 
  });

  return (
    <CustomTooltip
      active={active}
      payload={payload}
      label={label}
      config={config}
      totalData={totalData}
    />
  );
}

// Componente de tooltip específico para datos de earnings
export function EarningsTooltip({ 
  active, 
  payload, 
  label,
  showTotal = false,
  totalData,
  cpmRate
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  showTotal?: boolean;
  totalData?: number;
  cpmRate?: number;
}) {
  const config = useTooltipConfig('earnings', { 
    showTotal,
    customFormatters: {
      label: (label: string) => {
        if (label.length === 3) {
          return `${label} 2025`;
        }
        return label;
      }
    }
  });

  // Agregar información de CPM al payload si está disponible
  if (payload && payload.length > 0 && cpmRate) {
    payload[0].payload.cpm = cpmRate;
  }

  return (
    <CustomTooltip
      active={active}
      payload={payload}
      label={label}
      config={config}
      totalData={totalData}
    />
  );
}

// Componente de tooltip específico para datos de views
export function ViewsTooltip({ 
  active, 
  payload, 
  label,
  showTotal = false,
  totalData
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  showTotal?: boolean;
  totalData?: number;
}) {
  const config = useTooltipConfig('views', { showTotal });

  return (
    <CustomTooltip
      active={active}
      payload={payload}
      label={label}
      config={config}
      totalData={totalData}
    />
  );
}

// Exports principales
export default CustomTooltip;
