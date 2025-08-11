"use client";

import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { 
  MoreVertical, 
  Trash2, 
  ExternalLink, 
  Eye, 
  Calendar, 
  Loader2, 
  Search, 
  Filter,
  Target,
  TrendingUp,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  RefreshCw
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { SponsorRule } from '@/types';
import { isSponsorExpired, getActiveSponsors } from '@/types';
import { format, isAfter, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

type SponsorWithStats = SponsorRule & {
  linkTitle?: string;
  linkShortId?: string;
  views?: number;
  completions?: number;
  conversionRate?: number;
  lastSeen?: Date;
};

type FilterState = {
  status: 'all' | 'active' | 'inactive' | 'expired' | 'expiring';
  search: string;
  linkFilter: string;
};

export default function AdminSponsorsPage() {
  const [sponsors, setSponsors] = useState<SponsorWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<Record<string, { title: string; shortId: string }>>({});
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    search: '',
    linkFilter: 'all'
  });

  // Estadísticas generales
  const stats = useMemo(() => {
    const totalSponsors = sponsors.length;
    const activeSponsors = sponsors.filter(s => s.isActive && !isSponsorExpired(s)).length;
    const expiredSponsors = sponsors.filter(s => s.isActive && isSponsorExpired(s)).length;
    const inactiveSponsors = sponsors.filter(s => !s.isActive).length;
    
    // Sponsors expirando en los próximos 7 días
    const expiringSponsors = sponsors.filter(s => {
      if (!s.isActive || !s.expiresAt || isSponsorExpired(s)) return false;
      const expirationDate = s.expiresAt.toDate();
      const sevenDaysFromNow = addDays(new Date(), 7);
      return isAfter(expirationDate, new Date()) && !isAfter(expirationDate, sevenDaysFromNow);
    }).length;

    const totalViews = sponsors.reduce((sum, s) => sum + (s.views || 0), 0);
    const totalCompletions = sponsors.reduce((sum, s) => sum + (s.completions || 0), 0);
    const overallConversionRate = totalViews > 0 ? ((totalCompletions / totalViews) * 100) : 0;

    return {
      totalSponsors,
      activeSponsors,
      expiredSponsors,
      inactiveSponsors,
      expiringSponsors,
      totalViews,
      totalCompletions,
      overallConversionRate
    };
  }, [sponsors]);

  // Sponsors filtrados
  const filteredSponsors = useMemo(() => {
    return sponsors.filter(sponsor => {
      // Filtro por estado
      if (filters.status !== 'all') {
        switch (filters.status) {
          case 'active':
            if (!sponsor.isActive || isSponsorExpired(sponsor)) return false;
            break;
          case 'inactive':
            if (sponsor.isActive) return false;
            break;
          case 'expired':
            if (!sponsor.isActive || !isSponsorExpired(sponsor)) return false;
            break;
          case 'expiring':
            if (!sponsor.isActive || !sponsor.expiresAt || isSponsorExpired(sponsor)) return false;
            const expirationDate = sponsor.expiresAt.toDate();
            const sevenDaysFromNow = addDays(new Date(), 7);
            if (!isAfter(expirationDate, new Date()) || isAfter(expirationDate, sevenDaysFromNow)) return false;
            break;
        }
      }

      // Filtro por búsqueda
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const titleMatch = sponsor.title.toLowerCase().includes(searchLower);
        const urlMatch = sponsor.sponsorUrl.toLowerCase().includes(searchLower);
        const linkMatch = sponsor.linkTitle?.toLowerCase().includes(searchLower) || false;
        
        if (!titleMatch && !urlMatch && !linkMatch) return false;
      }

      // Filtro por enlace
      if (filters.linkFilter !== 'all' && sponsor.linkId !== filters.linkFilter) {
        return false;
      }

      return true;
    });
  }, [sponsors, filters]);

  // Cargar enlaces
  useEffect(() => {
    const unsubscribeLinks = onSnapshot(collection(db, 'links'), (snapshot) => {
      const linksData: Record<string, { title: string; shortId: string }> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        linksData[doc.id] = {
          title: data.title || 'Sin título',
          shortId: data.shortId || ''
        };
      });
      setLinks(linksData);
    });

    return () => unsubscribeLinks();
  }, []);

  // Cargar sponsors y estadísticas
  useEffect(() => {
    const unsubscribeSponsors = onSnapshot(collection(db, 'sponsorRules'), async (snapshot) => {
      setLoading(true);
      const sponsorsData: SponsorWithStats[] = [];

      for (const sponsorDoc of snapshot.docs) {
        const sponsorData = { id: sponsorDoc.id, ...sponsorDoc.data() } as SponsorRule;
        
        // Cargar estadísticas del sponsor
        let views = 0;
        let completions = 0;
        let lastSeen: Date | undefined;

        try {
          // Consultar clicks que incluyan este sponsor
          const clicksQuery = query(
            collection(db, 'clicks'),
            where('sponsorsData', 'array-contains-any', [{ sponsorId: sponsorData.id }])
          );
          const clicksSnapshot = await getDocs(clicksQuery);
          
          clicksSnapshot.docs.forEach(clickDoc => {
            const clickData = clickDoc.data();
            const sponsorInClick = clickData.sponsorsData?.find((s: any) => s.sponsorId === sponsorData.id);
            
            if (sponsorInClick) {
              views++;
              if (sponsorInClick.completedAt) {
                completions++;
              }
              
              const viewDate = sponsorInClick.viewedAt?.toDate();
              if (viewDate && (!lastSeen || viewDate > lastSeen)) {
                lastSeen = viewDate;
              }
            }
          });
        } catch (error) {
          console.error('Error loading sponsor stats:', error);
        }

        const conversionRate = views > 0 ? ((completions / views) * 100) : 0;

        sponsorsData.push({
          ...sponsorData,
          linkTitle: links[sponsorData.linkId]?.title,
          linkShortId: links[sponsorData.linkId]?.shortId,
          views,
          completions,
          conversionRate,
          lastSeen
        });
      }

      // Ordenar por fecha de creación (más recientes primero)
      sponsorsData.sort((a, b) => {
        const aDate = a.createdAt?.toDate() || new Date(0);
        const bDate = b.createdAt?.toDate() || new Date(0);
        return bDate.getTime() - aDate.getTime();
      });

      setSponsors(sponsorsData);
      setLoading(false);
    });

    return () => unsubscribeSponsors();
  }, [links]);

  // Función para alternar estado activo/inactivo
  const handleToggleStatus = async (sponsor: SponsorWithStats) => {
    try {
      const sponsorRef = doc(db, 'sponsorRules', sponsor.id);
      await updateDoc(sponsorRef, {
        isActive: !sponsor.isActive
      });

      toast({
        title: sponsor.isActive ? "Sponsor desactivado" : "Sponsor activado",
        description: `El sponsor "${sponsor.title}" ha sido ${sponsor.isActive ? 'desactivado' : 'activado'}.`,
      });
    } catch (error) {
      console.error('Error toggling sponsor status:', error);
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del sponsor.",
        variant: "destructive"
      });
    }
  };

  // Función para eliminar sponsor
  const handleDeleteSponsor = async (sponsor: SponsorWithStats) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el sponsor "${sponsor.title}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'sponsorRules', sponsor.id));
      
      toast({
        title: "Sponsor eliminado",
        description: `El sponsor "${sponsor.title}" ha sido eliminado permanentemente.`,
        variant: "destructive"
      });
    } catch (error) {
      console.error('Error deleting sponsor:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el sponsor.",
        variant: "destructive"
      });
    }
  };

  // Función para obtener el estado visual del sponsor
  const getSponsorStatus = (sponsor: SponsorWithStats) => {
    if (!sponsor.isActive) {
      return { label: 'Inactivo', variant: 'secondary' as const, color: 'text-gray-500' };
    }
    
    if (isSponsorExpired(sponsor)) {
      return { label: 'Expirado', variant: 'destructive' as const, color: 'text-red-500' };
    }

    // Verificar si expira pronto (próximos 7 días)
    if (sponsor.expiresAt) {
      const expirationDate = sponsor.expiresAt.toDate();
      const sevenDaysFromNow = addDays(new Date(), 7);
      if (isAfter(expirationDate, new Date()) && !isAfter(expirationDate, sevenDaysFromNow)) {
        return { label: 'Expirando pronto', variant: 'outline' as const, color: 'text-orange-500' };
      }
    }

    return { label: 'Activo', variant: 'default' as const, color: 'text-green-500' };
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold">Gestión Global de Sponsors</h1>
        
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Table Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  {[...Array(7)].map((_, i) => (
                    <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Gestión Global de Sponsors</h1>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-amber-600" />
            <span className="text-sm text-muted-foreground">
              {filteredSponsors.length} de {sponsors.length} sponsors
            </span>
          </div>
        </div>

        {/* Alertas de sponsors expirando */}
        {stats.expiringSponsors > 0 && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>{stats.expiringSponsors} sponsor(s)</strong> expiran en los próximos 7 días. 
              Considera renovar o reemplazar estos sponsors pronto.
            </AlertDescription>
          </Alert>
        )}

        {/* Cards de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Sponsors
              </CardTitle>
              <div className="text-2xl font-bold">{stats.totalSponsors}</div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sponsors Activos
              </CardTitle>
              <div className="text-2xl font-bold text-green-600">{stats.activeSponsors}</div>
              {stats.expiredSponsors > 0 && (
                <div className="text-xs text-red-500">
                  {stats.expiredSponsors} expirados
                </div>
              )}
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tasa de Conversión
              </CardTitle>
              <div className="text-2xl font-bold">
                {stats.overallConversionRate.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">
                {stats.totalCompletions}/{stats.totalViews} conversiones
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Expirando Pronto
              </CardTitle>
              <div className="text-2xl font-bold text-orange-600">
                {stats.expiringSponsors}
              </div>
              <div className="text-xs text-muted-foreground">
                Próximos 7 días
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Tabla de sponsors */}
        <Card>
          <CardHeader>
            <CardTitle>Todos los Sponsors</CardTitle>
            <CardDescription>
              Gestiona todos los sponsors del sistema con estadísticas detalladas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por título, URL o enlace..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value as FilterState['status'] }))}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                  <SelectItem value="expired">Expirados</SelectItem>
                  <SelectItem value="expiring">Expirando pronto</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.linkFilter}
                onValueChange={(value) => setFilters(prev => ({ ...prev, linkFilter: value }))}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtrar por enlace" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los enlaces</SelectItem>
                  {Object.entries(links).map(([linkId, link]) => (
                    <SelectItem key={linkId} value={linkId}>
                      {link.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sponsor</TableHead>
                  <TableHead className="hidden md:table-cell">Enlace</TableHead>
                  <TableHead className="hidden sm:table-cell">Estado</TableHead>
                  <TableHead className="hidden lg:table-cell">Estadísticas</TableHead>
                  <TableHead className="hidden lg:table-cell">Expiración</TableHead>
                  <TableHead className="hidden xl:table-cell">Creado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSponsors.map((sponsor) => {
                  const status = getSponsorStatus(sponsor);
                  
                  return (
                    <TableRow key={sponsor.id}>
                      <TableCell>
                        <div className="font-semibold truncate max-w-[200px]">
                          {sponsor.title}
                        </div>
                        <a 
                          href={sponsor.sponsorUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs text-muted-foreground hover:underline block truncate max-w-[200px]"
                        >
                          {sponsor.sponsorUrl}
                        </a>
                        
                        {/* Mobile-only details */}
                        <div className="md:hidden mt-2 space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Enlace:</span>
                            <span className="text-muted-foreground">
                              {sponsor.linkTitle || 'Sin título'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Estado:</span>
                            <Badge variant={status.variant} className="h-5">
                              {status.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              <span>{sponsor.views || 0} vistas</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              <span>{sponsor.conversionRate?.toFixed(1) || 0}%</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="hidden md:table-cell">
                        <div className="font-medium truncate max-w-[150px]">
                          {sponsor.linkTitle || 'Sin título'}
                        </div>
                        {sponsor.linkShortId && (
                          <div className="text-xs text-muted-foreground">
                            /{sponsor.linkShortId}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={status.variant}>
                          {status.label}
                        </Badge>
                      </TableCell>

                      <TableCell className="hidden lg:table-cell">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Eye className="h-3 w-3" />
                            <span>{sponsor.views || 0} vistas</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <TrendingUp className="h-3 w-3" />
                            <span>{sponsor.completions || 0} conversiones</span>
                            <span className="text-muted-foreground">
                              ({sponsor.conversionRate?.toFixed(1) || 0}%)
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="hidden lg:table-cell">
                        {sponsor.expiresAt ? (
                          <div className="text-sm">
                            {format(sponsor.expiresAt.toDate(), 'dd/MM/yyyy', { locale: es })}
                            {isSponsorExpired(sponsor) && (
                              <div className="text-xs text-red-500">Expirado</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin expiración</span>
                        )}
                      </TableCell>

                      <TableCell className="hidden xl:table-cell">
                        {sponsor.createdAt ? 
                          format(sponsor.createdAt.toDate(), 'dd/MM/yyyy', { locale: es }) : 
                          'N/A'
                        }
                      </TableCell>

                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => window.open(sponsor.sponsorUrl, '_blank')}>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              <span>Visitar URL</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleStatus(sponsor)}>
                              {sponsor.isActive ? (
                                <>
                                  <ToggleLeft className="mr-2 h-4 w-4 text-orange-500" />
                                  <span>Desactivar</span>
                                </>
                              ) : (
                                <>
                                  <ToggleRight className="mr-2 h-4 w-4 text-green-500" />
                                  <span>Activar</span>
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive" 
                              onClick={() => handleDeleteSponsor(sponsor)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Eliminar</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                
                {filteredSponsors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      {filters.search || filters.status !== 'all' || filters.linkFilter !== 'all' ? (
                        <div className="space-y-2">
                          <p>No se encontraron sponsors con los filtros aplicados.</p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setFilters({ status: 'all', search: '', linkFilter: 'all' })}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Limpiar filtros
                          </Button>
                        </div>
                      ) : (
                        <p>No hay sponsors en el sistema.</p>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
