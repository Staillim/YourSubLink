'use client';

import { useState } from 'react';
import { doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Trash2, 
  Power, 
  PowerOff, 
  CheckSquare, 
  Square, 
  Loader2, 
  AlertTriangle 
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import type { SponsorRule } from '../types';

interface BulkSponsorActionsProps {
  sponsors: SponsorRule[];
  selectedSponsors: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onActionComplete: () => void;
  currentFilter: string; // 'all', 'active', 'expired', 'inactive'
}

export function BulkSponsorActions({
  sponsors,
  selectedSponsors,
  onSelectionChange,
  onActionComplete,
  currentFilter
}: BulkSponsorActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete' | 'activate' | 'deactivate';
    open: boolean;
  }>({ type: 'delete', open: false });
  
  const { toast } = useToast();

  // Get sponsors that are currently visible (filtered)
  const visibleSponsors = sponsors.filter(sponsor => {
    if (currentFilter === 'all') return true;
    if (currentFilter === 'active') return sponsor.isActive && (!sponsor.expiresAt || sponsor.expiresAt.toDate() > new Date());
    if (currentFilter === 'expired') return sponsor.expiresAt && sponsor.expiresAt.toDate() <= new Date();
    if (currentFilter === 'inactive') return !sponsor.isActive;
    return true;
  });

  const allVisibleSelected = visibleSponsors.length > 0 && 
    visibleSponsors.every(sponsor => selectedSponsors.includes(sponsor.id!));
  
  const someSelected = selectedSponsors.length > 0;

  const handleSelectAll = () => {
    if (allVisibleSelected) {
      // Deselect all visible
      const newSelection = selectedSponsors.filter(id => 
        !visibleSponsors.find(sponsor => sponsor.id === id)
      );
      onSelectionChange(newSelection);
    } else {
      // Select all visible
      const visibleIds = visibleSponsors.map(sponsor => sponsor.id!).filter(Boolean);
      const newSelection = [...new Set([...selectedSponsors, ...visibleIds])];
      onSelectionChange(newSelection);
    }
  };

  const getAvailableActions = () => {
    const selectedSponsorData = sponsors.filter(s => selectedSponsors.includes(s.id!));
    
    const actions = [];
    
    // Always allow delete
    actions.push({ type: 'delete', label: 'Eliminar', icon: Trash2, variant: 'destructive' as const });
    
    // Activate action - show if some selected sponsors are inactive
    const hasInactive = selectedSponsorData.some(s => !s.isActive);
    if (hasInactive) {
      actions.push({ type: 'activate', label: 'Activar', icon: Power, variant: 'default' as const });
    }
    
    // Deactivate action - show if some selected sponsors are active
    const hasActive = selectedSponsorData.some(s => s.isActive);
    if (hasActive) {
      actions.push({ type: 'deactivate', label: 'Desactivar', icon: PowerOff, variant: 'secondary' as const });
    }
    
    return actions;
  };

  const handleBulkAction = async (actionType: 'delete' | 'activate' | 'deactivate') => {
    setIsLoading(true);
    
    try {
      const batch = writeBatch(db);
      let successCount = 0;
      
      for (const sponsorId of selectedSponsors) {
        const sponsorRef = doc(db, 'sponsorRules', sponsorId);
        
        if (actionType === 'delete') {
          batch.delete(sponsorRef);
        } else {
          batch.update(sponsorRef, {
            isActive: actionType === 'activate',
            updatedAt: new Date()
          });
        }
        
        successCount++;
      }
      
      await batch.commit();
      
      const actionLabels = {
        delete: 'eliminados',
        activate: 'activados',
        deactivate: 'desactivados'
      };
      
      toast({
        title: '✅ Acción completada',
        description: `${successCount} sponsors ${actionLabels[actionType]} correctamente`,
      });
      
      onSelectionChange([]);
      onActionComplete();
      
    } catch (error) {
      console.error(`Error in bulk ${actionType}:`, error);
      toast({
        title: 'Error',
        description: `No se pudo completar la acción: ${actionType}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setConfirmAction({ type: 'delete', open: false });
    }
  };

  const getConfirmationMessage = () => {
    const count = selectedSponsors.length;
    const messages = {
      delete: `¿Estás seguro de que deseas eliminar ${count} sponsor${count > 1 ? 's' : ''}? Esta acción no se puede deshacer.`,
      activate: `¿Estás seguro de que deseas activar ${count} sponsor${count > 1 ? 's' : ''}?`,
      deactivate: `¿Estás seguro de que deseas desactivar ${count} sponsor${count > 1 ? 's' : ''}?`
    };
    return messages[confirmAction.type];
  };

  if (!someSelected) {
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          checked={allVisibleSelected}
          onCheckedChange={handleSelectAll}
        />
        <span className="text-sm text-muted-foreground">
          Seleccionar todos ({visibleSponsors.length})
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allVisibleSelected}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-sm font-medium">
            {selectedSponsors.length} seleccionado{selectedSponsors.length > 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {getAvailableActions().map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.type}
                variant={action.variant}
                size="sm"
                onClick={() => setConfirmAction({ type: action.type as any, open: true })}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Icon className="h-4 w-4 mr-2" />
                )}
                {action.label}
              </Button>
            );
          })}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSelectionChange([])}
          disabled={isLoading}
        >
          Limpiar selección
        </Button>
      </div>

      <AlertDialog open={confirmAction.open} onOpenChange={(open) => 
        setConfirmAction(prev => ({ ...prev, open }))
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmar acción
            </AlertDialogTitle>
            <AlertDialogDescription>
              {getConfirmationMessage()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleBulkAction(confirmAction.type)}
              disabled={isLoading}
              className={confirmAction.type === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Checkbox component for individual sponsor selection
export function SponsorSelectionCheckbox({ 
  sponsorId, 
  selected, 
  onSelectionChange 
}: {
  sponsorId: string;
  selected: boolean;
  onSelectionChange: (selected: boolean) => void;
}) {
  return (
    <Checkbox
      checked={selected}
      onCheckedChange={onSelectionChange}
      onClick={(e) => e.stopPropagation()}
    />
  );
}
