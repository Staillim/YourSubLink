"use client";

import { useState } from 'react';
import { addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useUser } from '@/hooks/use-user';
import { db } from '@/lib/firebase';
import type { SponsorRule } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, Loader2, Target, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MultiSponsorDialogProps {
  linkIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onSponsorAdded?: () => void;
}

export function MultiSponsorDialog({ 
  linkIds, 
  isOpen, 
  onClose, 
  onSponsorAdded 
}: MultiSponsorDialogProps) {
  const { user } = useUser();
  
  // Estados del formulario
  const [title, setTitle] = useState('');
  const [sponsorUrl, setSponsorUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // Estados de UI
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    title?: string;
    sponsorUrl?: string;
    expiresAt?: string;
    general?: string;
  }>({});

  // Validación de URL
  const isValidUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Validar formulario
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Validar título
    if (!title.trim()) {
      newErrors.title = 'El título es obligatorio';
    } else if (title.trim().length < 3) {
      newErrors.title = 'El título debe tener al menos 3 caracteres';
    } else if (title.trim().length > 50) {
      newErrors.title = 'El título no puede exceder 50 caracteres';
    }

    // Validar URL
    if (!sponsorUrl.trim()) {
      newErrors.sponsorUrl = 'La URL es obligatoria';
    } else if (!isValidUrl(sponsorUrl.trim())) {
      newErrors.sponsorUrl = 'Debe ser una URL válida (http:// o https://)';
    }

    // Validar fecha de expiración
    if (expiresAt) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      if (expiresAt < tomorrow) {
        newErrors.expiresAt = 'La fecha debe ser al menos mañana';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Verificar límite de sponsors para múltiples enlaces
  const checkSponsorLimitsForAllLinks = async (): Promise<{ canAdd: boolean; blockedLinks: string[] }> => {
    const blockedLinks: string[] = [];
    
    try {
      for (const linkId of linkIds) {
        const sponsorsQuery = query(
          collection(db, 'sponsorRules'),
          where('linkId', '==', linkId),
          where('isActive', '==', true)
        );
        
        const sponsorsSnapshot = await getDocs(sponsorsQuery);
        if (sponsorsSnapshot.size >= 3) {
          blockedLinks.push(linkId);
        }
      }
      
      return {
        canAdd: blockedLinks.length === 0,
        blockedLinks
      };
    } catch (error) {
      console.error('Error checking sponsor limits:', error);
      return { canAdd: false, blockedLinks: [] };
    }
  };

  // Crear sponsors para múltiples enlaces
  const handleCreateSponsors = async () => {
    if (!user) {
      setErrors({ general: 'Debes estar autenticado como administrador' });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Verificar límites para todos los enlaces
      const { canAdd, blockedLinks } = await checkSponsorLimitsForAllLinks();
      
      if (!canAdd) {
        setErrors({ 
          general: `${blockedLinks.length} enlace(s) ya tienen el máximo de 3 sponsors. Solo se agregará a los enlaces válidos.` 
        });
      }

      // Filtrar enlaces válidos (que no han alcanzado el límite)
      const validLinkIds = linkIds.filter(linkId => !blockedLinks.includes(linkId));
      
      if (validLinkIds.length === 0) {
        setErrors({ 
          general: 'Todos los enlaces seleccionados ya tienen el máximo de 3 sponsors.' 
        });
        setIsLoading(false);
        return;
      }

      // Crear sponsors para todos los enlaces válidos
      const sponsorPromises = validLinkIds.map(linkId => {
        const sponsorData: Omit<SponsorRule, 'id'> = {
          linkId,
          userId: user.uid,
          title: title.trim(),
          sponsorUrl: sponsorUrl.trim(),
          isActive: true,
          createdAt: new Date(),
          views: 0,
          clicks: 0,
          ...(expiresAt && { expiresAt })
        };

        return addDoc(collection(db, 'sponsorRules'), sponsorData);
      });

      await Promise.all(sponsorPromises);

      // Reset form y cerrar diálogo
      setTitle('');
      setSponsorUrl('');
      setExpiresAt(undefined);
      setErrors({});
      
      // Callback de éxito
      onSponsorAdded?.();
      onClose();

    } catch (error) {
      console.error('Error creating sponsors:', error);
      setErrors({ 
        general: 'Error al crear los sponsors. Por favor intenta de nuevo.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset al cerrar
  const handleClose = () => {
    if (!isLoading) {
      setTitle('');
      setSponsorUrl('');
      setExpiresAt(undefined);
      setErrors({});
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-amber-600" />
            Agregar Sponsor a {linkIds.length} Enlaces
          </DialogTitle>
          <DialogDescription>
            Este sponsor se agregará a todos los enlaces seleccionados ({linkIds.length} enlaces). 
            Los usuarios deberán completar este sponsor antes de acceder a cualquiera de estos enlaces.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error general */}
          {errors.general && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Campo: Título */}
          <div className="space-y-2">
            <Label htmlFor="multi-sponsor-title">
              Título del Sponsor *
            </Label>
            <Input
              id="multi-sponsor-title"
              placeholder="Ej: Visita nuestra tienda online"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={cn(errors.title && "border-red-500")}
              disabled={isLoading}
              maxLength={50}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {title.length}/50 caracteres
            </p>
          </div>

          {/* Campo: URL */}
          <div className="space-y-2">
            <Label htmlFor="multi-sponsor-url">
              URL del Sponsor *
            </Label>
            <Input
              id="multi-sponsor-url"
              type="url"
              placeholder="https://ejemplo.com"
              value={sponsorUrl}
              onChange={(e) => setSponsorUrl(e.target.value)}
              className={cn(errors.sponsorUrl && "border-red-500")}
              disabled={isLoading}
            />
            {errors.sponsorUrl && (
              <p className="text-sm text-red-500">{errors.sponsorUrl}</p>
            )}
            <p className="text-xs text-muted-foreground">
              La URL debe comenzar con http:// o https://
            </p>
          </div>

          {/* Campo: Fecha de Expiración (Opcional) */}
          <div className="space-y-2">
            <Label htmlFor="multi-sponsor-expires">
              Fecha de Expiración (Opcional)
            </Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !expiresAt && "text-muted-foreground",
                    errors.expiresAt && "border-red-500"
                  )}
                  disabled={isLoading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiresAt ? (
                    format(expiresAt, "PPP", { locale: es })
                  ) : (
                    "Sin fecha de expiración"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expiresAt}
                  onSelect={(date) => {
                    setExpiresAt(date);
                    setIsCalendarOpen(false);
                  }}
                  disabled={(date) => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    return date < tomorrow;
                  }}
                  initialFocus
                  locale={es}
                />
                {expiresAt && (
                  <div className="p-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setExpiresAt(undefined);
                        setIsCalendarOpen(false);
                      }}
                    >
                      Quitar fecha de expiración
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            {errors.expiresAt && (
              <p className="text-sm text-red-500">{errors.expiresAt}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Si no estableces una fecha, el sponsor nunca expirará
            </p>
          </div>

          {/* Info sobre la operación */}
          <Alert>
            <Target className="h-4 w-4" />
            <AlertDescription>
              <strong>Información importante:</strong>
              <br />
              • Se creará el mismo sponsor para {linkIds.length} enlaces
              <br />
              • Máximo 3 sponsors por enlace (se omitirán enlaces que ya tengan 3)
              <br />
              • Los usuarios verán este sponsor en todos los enlaces seleccionados
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleCreateSponsors}
            disabled={isLoading || !title.trim() || !sponsorUrl.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Target className="mr-2 h-4 w-4" />
                Crear Sponsor para {linkIds.length} Enlaces
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
