'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ExternalLink, CheckCircle, Target, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SponsorRule } from '@/types';
import { doc, writeBatch, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SponsorRuleItemProps {
  sponsor: SponsorRule;
  index: number;
  state: 'pending' | 'loading' | 'completed';
  onStateChange: (index: number, state: 'pending' | 'loading' | 'completed') => void;
  onView: (sponsor: SponsorRule) => void;
  onComplete: (sponsor: SponsorRule) => void;
}

function LoadingDots() {
  return (
    <div className="flex items-center space-x-1">
      <span className="animate-[pulse_1.5s_ease-in-out_infinite] rounded-full h-1.5 w-1.5 bg-current"></span>
      <span className="animate-[pulse_1.5s_ease-in-out_0.2s_infinite] rounded-full h-1.5 w-1.5 bg-current"></span>
      <span className="animate-[pulse_1.5s_ease-in-out_0.4s_infinite] rounded-full h-1.5 w-1.5 bg-current"></span>
    </div>
  );
}

export function SponsorRuleItem({ 
  sponsor, 
  index, 
  state, 
  onStateChange, 
  onView, 
  onComplete 
}: SponsorRuleItemProps) {
  const [hasViewed, setHasViewed] = useState(false);
  const { toast } = useToast();

  const handleView = async () => {
    try {
      // Validar que el sponsor tiene ID
      if (!sponsor.id) {
        console.error('Error: sponsor.id is missing', sponsor);
        return;
      }

      console.log(`🔄 Incrementando view para sponsor: ${sponsor.title} (ID: ${sponsor.id})`);

      // REPLICAR EXACTAMENTE EL PATRÓN DE INCREMENTO EXITOSO (ClientComponent.tsx línea 88-90)
      const sponsorRef = doc(db, 'sponsorRules', sponsor.id);
      const batch = writeBatch(db);
      
      // 1. Increment the view counter (igual que se hace con clicks en links)
      batch.update(sponsorRef, { views: increment(1) });
      
      // Commit atomically (igual que en ClientComponent)
      await batch.commit();
      
      console.log(`✅ View incrementada exitosamente para sponsor: ${sponsor.title} (ID: ${sponsor.id})`);
      onView(sponsor);
    } catch (error) {
      console.error('❌ Error registering sponsor view:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
    }
  };

  // Registrar view al montar el componente
  useEffect(() => {
    console.log(`🔧 SponsorRuleItem useEffect ejecutando para: ${sponsor.title} (ID: ${sponsor.id})`);
    console.log(`🔧 hasViewed actual: ${hasViewed}`);
    
    if (!hasViewed) {
      console.log(`🚀 Ejecutando handleView para: ${sponsor.title}`);
      handleView();
      setHasViewed(true);
    } else {
      console.log(`⏭️  Ya se registró view para: ${sponsor.title}`);
    }
  }, []); // Remover dependencia hasViewed - solo ejecutar al montar

  const handleClick = async () => {
    if (state !== 'pending') return;

    onStateChange(index, 'loading');

    try {
      // Validar que el sponsor tiene ID
      if (!sponsor.id) {
        console.error('Error: sponsor.id is missing for click', sponsor);
        onStateChange(index, 'pending');
        return;
      }

      // Incrementar contador de clicks
      const sponsorRef = doc(db, 'sponsorRules', sponsor.id);
      const batch = writeBatch(db);
      batch.update(sponsorRef, { clicks: increment(1) });
      await batch.commit();

      console.log(`✅ Click incrementado para sponsor: ${sponsor.title} (ID: ${sponsor.id})`);

      // Abrir enlace del sponsor
      window.open(sponsor.sponsorUrl, '_blank');

      // Iniciar cuenta regresiva invisible de 7 segundos
      let timerDone = false;
      const timer = setTimeout(() => {
        timerDone = true;
      }, 7000);

      // Handler para cuando el usuario regresa a la página
      const focusHandler = () => {
        clearTimeout(timer);
        window.removeEventListener('focus', focusHandler);
        if (timerDone) {
          onStateChange(index, 'completed');
          onComplete(sponsor);
        } else {
          onStateChange(index, 'pending');
          toast({
            title: 'Debes permanecer al menos 7 segundos en el sponsor',
            description: 'Intenta de nuevo para desbloquear.',
            variant: 'destructive',
          });
        }
      };
      window.addEventListener('focus', focusHandler);
    } catch (error) {
      console.error('Error handling sponsor click:', error);
      onStateChange(index, 'pending');
    }
  };

  const isCompleted = state === 'completed';
  const isLoading = state === 'loading';

  return (
    <button
      onClick={handleClick}
      disabled={state !== 'pending'}
      data-sponsor-id={sponsor.id}
      data-sponsor-title={sponsor.title}
      className={cn(
        "w-full flex items-center justify-between p-4 border rounded-lg transition-all duration-300 relative",
        "border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100",
        isCompleted && "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200",
        isLoading && "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200",
        (isCompleted || isLoading) && "cursor-default"
      )}
    >
      {/* Sponsor Badge */}
      <div className="absolute -top-2 -right-2 z-10">
        <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
          SPONSOR
        </span>
      </div>

      {/* Content */}
      <div className="flex items-center space-x-3 flex-1">
        {/* Status Icon */}
        <div className="flex items-center justify-center">
          {isCompleted ? (
            <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
          ) : isLoading ? (
            <div className="h-5 w-5 shrink-0 flex items-center justify-center text-blue-600">
              <LoadingDots />
            </div>
          ) : (
            <div className="h-5 w-5 shrink-0 rounded-full border-2 border-amber-400 bg-white"></div>
          )}
        </div>

        {/* Sponsor Info */}
        <div className="flex flex-col flex-1">
          <span className="font-semibold text-sm text-gray-900 group-hover:text-amber-700 transition-colors">
            {sponsor.title}
          </span>
          <span className="text-xs text-amber-600 font-medium">
            Patrocinador • Obligatorio
          </span>
        </div>
      </div>

      {/* External Link Icon */}
      {!isLoading && !isCompleted && (
        <ExternalLink className="h-5 w-5 shrink-0 text-amber-500 transition-colors" />
      )}

      {/* Loading Timer Visual */}
      {isLoading && (
        <div className="text-xs text-blue-600 font-medium">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}
    </button>
  );
}
