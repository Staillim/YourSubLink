'use client';

import { Crown, TrendingUp, Info } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CustomCpmCardProps {
  customCpm: number;
  globalCpm: number;
  hasCustomCpm: boolean;
}

export function CustomCpmNotificationCard({ 
  customCpm, 
  globalCpm, 
  hasCustomCpm 
}: CustomCpmCardProps) {
  // No mostrar la tarjeta si no tiene CPM custom
  if (!hasCustomCpm || !customCpm || customCpm <= 0) {
    return null;
  }

  const isHigherThanGlobal = customCpm > globalCpm;
  const difference = Math.abs(customCpm - globalCpm);
  const percentageDiff = globalCpm > 0 ? ((difference / globalCpm) * 100) : 0;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base font-semibold text-primary">
              CPM Personalizado Activo
            </CardTitle>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            Premium
          </Badge>
        </div>
        <CardDescription className="text-sm text-muted-foreground">
          Se te ha asignado una tasa personalizada para optimizar tus ganancias
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Comparación de CPM */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Tu CPM Personalizado</p>
            <p className="text-lg font-bold text-primary">
              ${customCpm.toFixed(4)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">CPM Global</p>
            <p className="text-lg font-semibold text-muted-foreground">
              ${globalCpm.toFixed(4)}
            </p>
          </div>
        </div>

        {/* Indicador de diferencia */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
          {isHigherThanGlobal ? (
            <>
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-700">
                  Tasa Premium Mejorada
                </p>
                <p className="text-xs text-muted-foreground">
                  Tu CPM es {percentageDiff.toFixed(1)}% superior al global
                </p>
              </div>
            </>
          ) : (
            <>
              <Info className="h-4 w-4 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-700">
                  Tasa Personalizada
                </p>
                <p className="text-xs text-muted-foreground">
                  CPM optimizado para tu perfil específico
                </p>
              </div>
            </>
          )}
        </div>

        {/* Mensaje informativo */}
        <div className="pt-2 border-t border-primary/10">
          <p className="text-xs text-muted-foreground leading-relaxed">
            💰 <strong>¿Qué significa esto?</strong> Todas tus ganancias se calculan con tu CPM personalizado de ${customCpm.toFixed(4)} en lugar del CPM global.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
