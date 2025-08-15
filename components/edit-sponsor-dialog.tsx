'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { SponsorRule } from '../types';

const editSponsorSchema = z.object({
  title: z.string()
    .min(1, 'El título es requerido')
    .max(100, 'El título no puede exceder 100 caracteres'),
  sponsorUrl: z.string()
    .url('Debe ser una URL válida')
    .min(1, 'La URL es requerida'),
  expiresAt: z.date().optional(),
  expireInHours: z.string().optional(),
});

type EditSponsorForm = z.infer<typeof editSponsorSchema>;

interface EditSponsorDialogProps {
  sponsor: SponsorRule | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSponsorUpdated: () => void;
}

export function EditSponsorDialog({
  sponsor,
  open,
  onOpenChange,
  onSponsorUpdated,
}: EditSponsorDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<EditSponsorForm & { expireInHours?: string }>({
    resolver: zodResolver(editSponsorSchema),
    defaultValues: {
      title: sponsor?.title || '',
      sponsorUrl: sponsor?.sponsorUrl || '',
      expiresAt: sponsor?.expiresAt?.toDate(),
      expireInHours: '',
    },
  });

  // Reset form when sponsor changes
  useState(() => {
    if (sponsor) {
      form.reset({
        title: sponsor.title,
        sponsorUrl: sponsor.sponsorUrl,
        expiresAt: sponsor.expiresAt?.toDate(),
      });
    }
  });

  const onSubmit = async (data: EditSponsorForm & { expireInHours?: string }) => {
    if (!sponsor?.id) {
      toast({
        title: 'Error',
        description: 'ID del sponsor no encontrado',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const sponsorRef = doc(db, 'sponsorRules', sponsor.id);
      const updateData: any = {
        title: data.title,
        sponsorUrl: data.sponsorUrl,
        updatedAt: new Date(),
      };

      // Expiración por horas tiene prioridad
      if (data.expireInHours && Number(data.expireInHours) > 0) {
        updateData.expiresAt = new Date(Date.now() + Number(data.expireInHours) * 60 * 60 * 1000);
      } else if (data.expiresAt) {
        updateData.expiresAt = data.expiresAt;
      } else {
        updateData.expiresAt = null;
      }

      await updateDoc(sponsorRef, updateData);

      toast({
        title: '✅ Sponsor actualizado',
        description: `${data.title} ha sido actualizado correctamente`,
      });

      onSponsorUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating sponsor:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el sponsor',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Sponsor</DialogTitle>
          <DialogDescription>
            Modifica los detalles del sponsor seleccionado.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Sponsor</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del sponsor..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sponsorUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL del Sponsor</FormLabel>
                  <FormControl>
                    <Input 
                      type="url"
                      placeholder="https://ejemplo.com" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campo: Expiración por horas (opcional) */}
            <FormField
              control={form.control}
              name="expireInHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiración en horas (opcional, para sponsors de menos de 24h)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max="24"
                      placeholder="Ej: 3"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Si se especifica, el sponsor expirará en ese número de horas desde ahora.
                  </p>
                </FormItem>
              )}
            />

            {/* Campo: Fecha de Expiración (opcional) */}
            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de Expiración (opcional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'dd/MM/yyyy', { locale: es })
                          ) : (
                            <span>Seleccionar fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        locale={es}
                      />
                      {field.value && (
                        <div className="p-3 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => field.onChange(undefined)}
                            className="w-full"
                          >
                            Quitar fecha de expiración
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Si no estableces una fecha ni horas, el sponsor nunca expirará
                  </p>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
