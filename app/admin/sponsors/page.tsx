'use client';

import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { 
  MoreVertical, 
  ExternalLink, 
  Power, 
  Trash2, 
  Search, 
  Filter, 
  AlertTriangle,
  Target,
  BarChart3,
  TrendingUp,
  Eye,
  MousePointer,
  Edit
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { SponsorRule, isSponsorExpired, getActiveSponsors } from '../../../types';
import { format, isAfter, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { EditSponsorDialog } from '@/components/edit-sponsor-dialog';
import { BulkSponsorActions, SponsorSelectionCheckbox } from '@/components/bulk-sponsor-actions';
import { SponsorChartsContainer } from '@/components/charts/sponsor-charts';
import { 
  processPieChartData, 
  processLineChartData, 
  processBarChartData, 
  processAreaChartData,
  calculateSummaryStats 
} from '@/components/charts/chart-data-processors';

export default function AdminSponsorsPage() {
  const [sponsors, setSponsors] = useState<SponsorRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'inactive'>('all');
  
  // New states for editing and bulk selection
  const [editingSponsor, setEditingSponsor] = useState<SponsorRule | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSponsors, setSelectedSponsors] = useState<string[]>([]);
  const [linkFilter, setLinkFilter] = useState<string>('all');

  // Cargar sponsors desde Firestore
  useEffect(() => {
    const sponsorsQuery = query(
      collection(db, 'sponsorRules'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(sponsorsQuery, (snapshot) => {
      const sponsorsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SponsorRule[];
      
      setSponsors(sponsorsData);
      setLoading(false);
    }, (error) => {
      console.error('Error loading sponsors:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los sponsors',
        variant: 'destructive',
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Estadísticas calculadas
  const stats = useMemo(() => {
    const total = sponsors.length;
    const active = sponsors.filter(s => s.isActive && !isSponsorExpired(s)).length;
    const expired = sponsors.filter(s => isSponsorExpired(s)).length;
    const expiringSoon = sponsors.filter(s => 
      s.isActive && 
      !isSponsorExpired(s) && 
      s.expiresAt && 
      isAfter(addDays(new Date(), 7), s.expiresAt.toDate())
    ).length;

    // Calcular tasa de conversión real basada en estadísticas
    const totalViews = sponsors.reduce((sum, s) => sum + (s.views || 0), 0);
    const totalClicks = sponsors.reduce((sum, s) => sum + (s.clicks || 0), 0);
    const conversionRate = totalViews > 0 ? 
      Math.round((totalClicks / totalViews) * 100 * 100) / 100 : 0;

    return { total, active, expired, expiringSoon, conversionRate };
  }, [sponsors]);

  // Datos procesados para gráficos
  const chartData = useMemo(() => {
    const pieData = processPieChartData(sponsors);
    const lineData = processLineChartData(sponsors);
    const barData = processBarChartData(sponsors);
    const areaData = processAreaChartData(sponsors);
    const summaryStats = calculateSummaryStats(sponsors);

    return {
      pieData,
      lineData,
      barData,
      areaData,
      summaryStats
    };
  }, [sponsors]);

  // Enlaces únicos para filtro
  const uniqueLinks = useMemo(() => {
    const links = [...new Set(sponsors.map(s => s.linkId))];
    return links;
  }, [sponsors]);

  // Sponsors filtrados
  const filteredSponsors = useMemo(() => {
    return sponsors.filter(sponsor => {
      // Filtro de búsqueda
      const matchesSearch = searchTerm === '' || 
        sponsor.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sponsor.sponsorUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sponsor.linkId.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro de estado
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && sponsor.isActive && !isSponsorExpired(sponsor)) ||
        (statusFilter === 'expired' && isSponsorExpired(sponsor)) ||
        (statusFilter === 'inactive' && !sponsor.isActive);

      // Filtro de enlace
      const matchesLink = linkFilter === 'all' || sponsor.linkId === linkFilter;

      return matchesSearch && matchesStatus && matchesLink;
    });
  }, [sponsors, searchTerm, statusFilter, linkFilter]);

  // Funciones de gestión
  const toggleSponsorStatus = async (sponsorId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'sponsorRules', sponsorId), {
        isActive: !currentStatus
      });
      toast({
        title: 'Sponsor actualizado',
        description: `Sponsor ${!currentStatus ? 'activado' : 'desactivado'} exitosamente`,
      });
    } catch (error) {
      console.error('Error updating sponsor:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el sponsor',
        variant: 'destructive',
      });
    }
  };

  const deleteSponsor = async (sponsorId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este sponsor?')) return;

    try {
      await deleteDoc(doc(db, 'sponsorRules', sponsorId));
      toast({
        title: 'Sponsor eliminado',
        description: 'El sponsor ha sido eliminado exitosamente',
      });
    } catch (error) {
      console.error('Error deleting sponsor:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el sponsor',
        variant: 'destructive',
      });
    }
  };

  const getSponsorStatus = (sponsor: SponsorRule) => {
    if (isSponsorExpired(sponsor)) {
      return { label: 'Expirado', variant: 'destructive' as const };
    }
    if (!sponsor.isActive) {
      return { label: 'Inactivo', variant: 'secondary' as const };
    }
    return { label: 'Activo', variant: 'default' as const };
  };

  // New functions for editing and bulk actions
  const handleEditSponsor = (sponsor: SponsorRule) => {
    setEditingSponsor(sponsor);
    setIsEditDialogOpen(true);
  };

  const handleSponsorUpdated = () => {
    // The onSnapshot listener will automatically update the sponsors list
    // We just need to close the dialog
    setIsEditDialogOpen(false);
    setEditingSponsor(null);
  };

  const handleSelectionChange = (sponsorId: string, selected: boolean) => {
    if (selected) {
      setSelectedSponsors(prev => [...prev, sponsorId]);
    } else {
      setSelectedSponsors(prev => prev.filter(id => id !== sponsorId));
    }
  };

  const handleBulkSelectionChange = (selectedIds: string[]) => {
    setSelectedSponsors(selectedIds);
  };

  const handleBulkActionComplete = () => {
    // The onSnapshot listener will automatically update the sponsors list
    setSelectedSponsors([]);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setLinkFilter('all');
    setSelectedSponsors([]); // Clear selections when filtering
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Sponsors</h1>
          <p className="text-muted-foreground">Administra todos los sponsors del sistema</p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Gestión de Sponsors</h1>
        <p className="text-muted-foreground">
          Administra todos los sponsors del sistema con estadísticas detalladas
        </p>
      </div>

      {/* Estadísticas Dashboard */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sponsors</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">En todo el sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversión</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">Tasa promedio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expirando</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.expiringSoon}</div>
            <p className="text-xs text-muted-foreground">Próximos 7 días</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Analíticos */}
      {sponsors.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Análisis Gráfico</h2>
            <Badge variant="secondary" className="ml-auto">
              {sponsors.length} sponsors analizados
            </Badge>
          </div>
          
          <SponsorChartsContainer
            pieData={chartData.pieData}
            lineData={chartData.lineData}
            barData={chartData.barData}
            areaData={chartData.areaData}
            totalSponsors={stats.total}
            averageConversion={stats.conversionRate}
          />
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar sponsors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="expired">Expirados</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={linkFilter} onValueChange={setLinkFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Enlace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los enlaces</SelectItem>
                {uniqueLinks.map((linkId) => (
                  <SelectItem key={linkId} value={linkId}>
                    {linkId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={clearFilters}>
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {(selectedSponsors.length > 0 || filteredSponsors.length > 0) && (
        <BulkSponsorActions
          sponsors={filteredSponsors}
          selectedSponsors={selectedSponsors}
          onSelectionChange={handleBulkSelectionChange}
          onActionComplete={handleBulkActionComplete}
          currentFilter={statusFilter}
        />
      )}

      {/* Tabla de Sponsors */}
      <Card>
        <CardHeader>
          <CardTitle>
            Sponsors ({filteredSponsors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    {/* Empty header for checkbox column */}
                  </TableHead>
                  <TableHead>Sponsor</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Enlace</TableHead>
                  <TableHead>Estadísticas</TableHead>
                  <TableHead>Expiración</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSponsors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Target className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {sponsors.length === 0 
                            ? 'No hay sponsors en el sistema' 
                            : 'No hay sponsors que coincidan con los filtros'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSponsors.map((sponsor) => {
                    const status = getSponsorStatus(sponsor);
                    const isExpiringSoon = sponsor.isActive && 
                      !isSponsorExpired(sponsor) && 
                      sponsor.expiresAt && 
                      isAfter(addDays(new Date(), 7), sponsor.expiresAt.toDate());

                    return (
                      <TableRow key={sponsor.id}>
                        <TableCell>
                          <SponsorSelectionCheckbox
                            sponsorId={sponsor.id!}
                            selected={selectedSponsors.includes(sponsor.id!)}
                            onSelectionChange={(selected) => 
                              handleSelectionChange(sponsor.id!, selected)
                            }
                          />
                        </TableCell>
                        
                        <TableCell>
                          <div>
                            <div className="font-medium">{sponsor.title}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-48">
                              {sponsor.sponsorUrl}
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={status.variant}>
                              {status.label}
                            </Badge>
                            {isExpiringSoon && (
                              <Badge variant="outline" className="text-orange-600">
                                Expira pronto
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {sponsor.linkId}
                          </code>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              <span>{sponsor.views || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MousePointer className="h-3 w-3" />
                              <span>{sponsor.clicks || 0}</span>
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          {sponsor.expiresAt ? (
                            <div className="text-sm">
                              {format(sponsor.expiresAt.toDate(), 'dd/MM/yyyy', { locale: es })}
                            </div>
                          ) : (
                            <Badge variant="outline">Sin expiración</Badge>
                          )}
                        </TableCell>
                        
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEditSponsor(sponsor)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar Sponsor
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem
                                onClick={() => window.open(sponsor.sponsorUrl, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Visitar URL
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem
                                onClick={() => sponsor.id && toggleSponsorStatus(sponsor.id, sponsor.isActive)}
                                disabled={!sponsor.id}
                              >
                                <Power className="h-4 w-4 mr-2" />
                                {sponsor.isActive ? 'Desactivar' : 'Activar'}
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem
                                onClick={() => sponsor.id && deleteSponsor(sponsor.id)}
                                disabled={!sponsor.id}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Edit Sponsor Dialog */}
      <EditSponsorDialog
        sponsor={editingSponsor}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSponsorUpdated={handleSponsorUpdated}
      />
    </div>
  );
}
