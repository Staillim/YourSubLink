'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, CheckCircle, Target, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SponsorRule } from '@/types';
import { doc, writeBatch, increment, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SponsorRuleItemProps {
  sponsor: SponsorRule;
  index: number;
  state: 'pending' | 'loading' | 'completed';
  onStateChange: (index: number, state: 'pending' | 'loading' | 'completed') => void;
  onView: (sponsor: SponsorRule) => void;
  onComplete: (sponsor: SponsorRule) => void;
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

      // REPLICAR EXACTAMENTE EL PATRÓN DE INCREMENTO EXITOSO (ClientComponent.tsx línea 88-90)
      const sponsorRef = doc(db, 'sponsorRules', sponsor.id);
      const batch = writeBatch(db);
      
      // 1. Increment the click counter (igual que se hace con clicks en links)
      batch.update(sponsorRef, { clicks: increment(1) });
      
      // Commit atomically (igual que en ClientComponent)
      await batch.commit();

      console.log(`✅ Click incrementado para sponsor: ${sponsor.title} (ID: ${sponsor.id})`);

      // Abrir enlace del sponsor
      window.open(sponsor.sponsorUrl, '_blank');

      // Simular tiempo de procesamiento (2-3 segundos)
      setTimeout(() => {
        onStateChange(index, 'completed');
        onComplete(sponsor);
      }, 2500);
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
      disabled={isCompleted || isLoading}
      data-sponsor-id={sponsor.id}
      data-sponsor-title={sponsor.title}
      className={cn(
        "w-full p-4 rounded-lg border-2 transition-all duration-300 flex items-center justify-between",
        "hover:shadow-md active:scale-[0.98]",
        isCompleted 
          ? "bg-green-50 border-green-200 cursor-default" 
          : isLoading 
            ? "bg-amber-50 border-amber-200 cursor-wait"
            : "bg-background border-border hover:border-amber-300 hover:bg-amber-50/50"
      )}
    >
      <div className="flex items-center space-x-3">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
        ) : isCompleted ? (
          <CheckCircle className="h-5 w-5 text-green-600" />
        ) : (
          <Target className="h-5 w-5 text-amber-600" />
        )}
        <div className="text-left">
          <div className="font-medium text-sm">
            {sponsor.title}
          </div>
          <div className="text-xs text-muted-foreground">
            {isCompleted ? "Completed" : isLoading ? "Processing..." : "Click to visit"}
          </div>
        </div>
      </div>
      {!isLoading && !isCompleted && <ExternalLink className="h-5 w-5 shrink-0" />}
    </button>
  );
}
