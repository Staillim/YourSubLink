

'use client';

import { useEffect, useState, useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, deleteDoc, getDoc, getDocs, updateDoc, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import type { LinkData, SponsorRule } from '../../../types';
import { AddSponsorDialog } from '../../../components/add-sponsor-dialog';
import { MultiSponsorDialog } from '../../../components/multi-sponsor-dialog';
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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { MoreVertical, Trash2, ExternalLink, BarChart3, Eye, Calendar, ShieldCheck, Loader2, DollarSign, ShieldBan, Plus, Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { analyzeLinkSecurity } from '@/ai/flows/analyzeLinkSecurity';
import { isSponsorExpired } from '../../../types';


type Link = {
  id: string;
  title: string;
  original: string;
  shortId: string;
  short: string;
  clicks: number;
  monetizable: boolean;
  monetizationStatus: 'active' | 'suspended';
  createdAt: any;
  userId: string;
  userName?: string;
  userEmail?: string;
  generatedEarnings?: number;
};

export default function AdminLinksPage() {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [isAnalyzing, startTransition] = useTransition();
  const [analyzingLinkId, setAnalyzingLinkId] = useState<string | null>(null);
  
  // Estados para sponsors
  const [sponsors, setSponsors] = useState<Record<string, SponsorRule[]>>({});
  const [search, setSearch] = useState('');
  const [sponsorDialogOpen, setSponsorDialogOpen] = useState(false);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  
  // Estados para selección múltiple
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());
  const [isMultiSponsorDialogOpen, setIsMultiSponsorDialogOpen] = useState(false);

  // Función para obtener los links manualmente
  const fetchLinks = async () => {
    setLoading(true);
    const snapshot = await getDocs(collection(db, 'links'));
    const linksData: Link[] = [];
    for (const linkDoc of snapshot.docs) {
      const data = linkDoc.data();
      let userName = 'N/A';
      let userEmail = 'N/A';
      if (data.userId) {
        const userRef = doc(db, 'users', data.userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          userName = userSnap.data().displayName;
          userEmail = userSnap.data().email;
        }
      }
      linksData.push({
        id: linkDoc.id,
        ...data,
        short: `${window.location.origin}/link/${data.shortId}`,
        createdAt: data.createdAt,
        userName,
        userEmail,
        monetizationStatus: data.monetizationStatus || 'active',
        generatedEarnings: data.generatedEarnings || 0,
      } as Link);
    }
    setLinks(linksData.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds));
    setLoading(false);
  };

  // Cargar los links solo al montar el componente o cuando se refresca
  useEffect(() => {
    fetchLinks();
  }, []);

  // Cargar sponsors de todos los enlaces
  useEffect(() => {
    const unsubscribeSponsors = onSnapshot(collection(db, 'sponsorRules'), (snapshot) => {
      const sponsorsData: Record<string, SponsorRule[]> = {};
      
      snapshot.docs.forEach(doc => {
        const sponsor = { id: doc.id, ...doc.data() } as SponsorRule;
        if (!sponsorsData[sponsor.linkId]) {
          sponsorsData[sponsor.linkId] = [];
        }
        sponsorsData[sponsor.linkId].push(sponsor);
      });
      
      setSponsors(sponsorsData);
    });

    return () => unsubscribeSponsors();
  }, []);

  const handleDelete = async (id: string, userId: string, title: string) => {
    if(!confirm('Are you sure you want to delete this link permanently? This will notify the user.')) return;
    try {
        const batch = writeBatch(db);

        // First, create a notification for the user
        const notificationRef = doc(collection(db, 'notifications'));
        batch.set(notificationRef, {
            userId: userId,
            type: 'link_deleted',
            message: `Your link "${title}" was deleted by an administrator.`,
            createdAt: serverTimestamp(),
            isRead: false,
        });

        // Then, delete the link
        const linkRef = doc(db, "links", id);
        batch.delete(linkRef);
        
        await batch.commit();

        toast({
            title: "Link deleted",
            description: "The link has been permanently removed and the user has been notified.",
            variant: "destructive"
        })
    } catch (error) {
        toast({
            title: "Error deleting link",
            description: "There was an error deleting the link.",
            variant: "destructive"
        })
    }
  };
  
  const handleToggleMonetization = async (link: Link) => {
    const newStatus = link.monetizationStatus === 'active' ? 'suspended' : 'active';

    try {
        const batch = writeBatch(db);
        const linkRef = doc(db, 'links', link.id);
        batch.update(linkRef, { monetizationStatus: newStatus });

        // Create a notification only when suspending
        if (newStatus === 'suspended') {
            const notificationRef = doc(collection(db, 'notifications'));
            batch.set(notificationRef, {
                userId: link.userId,
                type: 'link_suspension',
                message: `Monetization for your link "${link.title}" has been suspended due to suspicious activity.`,
                linkId: link.id,
                createdAt: serverTimestamp(),
                isRead: false,
            });
        }
        
        await batch.commit();
        
        // This toast is shown to the admin after the action is successful
        toast({
            title: 'Monetization Updated',
            description: `Monetization for "${link.title}" has been set to ${newStatus}.`,
        });

    } catch (error) {
        toast({
            title: 'Error',
            description: 'Could not update monetization status.',
            variant: 'destructive',
        });
        console.error("Error toggling monetization: ", error);
    }
};


  const handleAnalyzeLink = (link: Link) => {
    startTransition(async () => {
        setAnalyzingLinkId(link.id);
        try {
            const result = await analyzeLinkSecurity({ linkId: link.id });
            if (result.isSuspicious) {
                if (result.riskLevel === 'high') {
                    // Suspend and notify in one go
                    await handleToggleMonetization(link);
                    toast({
                        title: 'Analysis Complete: High Risk',
                        description: `Monetization for "${link.title}" has been automatically suspended. Reason: ${result.reason}`,
                        variant: 'destructive',
                        duration: 8000
                    });
                } else {
                     toast({
                        title: 'Analysis Complete: Moderate Risk',
                        description: `Link "${link.title}" shows suspicious activity. Reason: ${result.reason}`,
                    });
                }
            } else {
                toast({
                    title: 'Analysis Complete',
                    description: `No suspicious activity detected for "${link.title}".`,
                });
            }
        } catch (error) {
             toast({
                title: "Error during analysis",
                description: "Could not complete the security analysis.",
                variant: "destructive"
            });
        } finally {
            setAnalyzingLinkId(null);
        }
    });
  };

  // Funciones para sponsors
  const getSponsorStats = (linkId: string) => {
    const linkSponsors = sponsors[linkId] || [];
    const totalSponsors = linkSponsors.length;
    const activeSponsors = linkSponsors.filter((s: SponsorRule) => s.isActive && !isSponsorExpired(s));
    const expiredSponsors = linkSponsors.filter((s: SponsorRule) => isSponsorExpired(s));
    
    return {
      total: totalSponsors,
      active: activeSponsors.length,
      expired: expiredSponsors.length,
      canAddMore: activeSponsors.length < 3
    };
  };

  // Funciones para diálogo de sponsor individual
  const handleAddSponsor = (linkId: string) => {
    setSelectedLinkId(linkId);
    setSponsorDialogOpen(true);
  };

  const handleSponsorAdded = () => {
    // Los sponsors se actualizan automáticamente por el listener
    toast({
      title: "Sponsor Creado",
      description: "El sponsor ha sido agregado exitosamente al enlace.",
    });
  };

  // Funciones para selección múltiple
  const handleSelectLink = (linkId: string, checked: boolean) => {
    const newSelected = new Set(selectedLinks);
    if (checked) {
      newSelected.add(linkId);
    } else {
      newSelected.delete(linkId);
    }
    setSelectedLinks(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLinks(new Set(links.map(link => link.id)));
    } else {
      setSelectedLinks(new Set());
    }
  };

  const handleMultiSponsorAdd = () => {
    if (selectedLinks.size === 0) {
      toast({
        title: "Sin selección",
        description: "Selecciona al menos un enlace para agregar sponsors.",
        variant: "destructive"
      });
      return;
    }
    setIsMultiSponsorDialogOpen(true);
  };

  const handleMultiSponsorAdded = () => {
    setSelectedLinks(new Set());
    setIsMultiSponsorDialogOpen(false);
    toast({
      title: "Sponsors Creados",
      description: `El sponsor ha sido agregado a ${selectedLinks.size} enlaces seleccionados.`,
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Link Management</h1>
        {/* Input de búsqueda también visible en loading para UX consistente */}
        <div className="mb-4 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <Input
            placeholder="Buscar por ID, usuario o enlace acortado..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-80"
            disabled
          />
        </div>
        <Card>
          <CardHeader>
             <Skeleton className="h-6 w-48" />
             <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        {[...Array(7)].map((_,i) => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(5)].map((_, i) => (
                         <TableRow key={i}>
                             {[...Array(7)].map((_,j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
                         </TableRow>
                    ))}
                </TableBody>
             </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Lógica de filtrado avanzada
  const filteredLinks = links.filter(link => {
    const q = search.toLowerCase();
    return (
      link.id.toLowerCase().includes(q) ||
      (link.userName && link.userName.toLowerCase().includes(q)) ||
      (link.userEmail && link.userEmail.toLowerCase().includes(q)) ||
      (link.shortId && link.shortId.toLowerCase().includes(q)) ||
      (link.short && link.short.toLowerCase().includes(q))
    );
  });

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Link Management</h1>
          {/* Botón para agregar sponsor a múltiples enlaces */}
          <div className="flex items-center gap-4">
            {selectedLinks.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedLinks.size} enlace(s) seleccionado(s)
                </span>
                <Button 
                  onClick={handleMultiSponsorAdd}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Agregar Sponsor a Seleccionados
                </Button>
              </div>
            )}
          </div>
        </div>
        {/* Input de búsqueda avanzado */}
        <div className="mb-4 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <div className="flex w-full sm:w-auto gap-2 items-center">
            <Input
              placeholder="Buscar por ID, usuario o enlace acortado..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-80"
            />
            <Button
              type="button"
              variant="outline"
              onClick={fetchLinks}
              title="Refrescar links"
              className="h-10 px-3"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <Card>
            <CardHeader>
            <CardTitle>All Links</CardTitle>
            <CardDescription>View and manage all links in the system.</CardDescription>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedLinks.size === links.length && links.length > 0}
                        onCheckedChange={handleSelectAll}
                        aria-label="Seleccionar todos los enlaces"
                      />
                    </TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead className="hidden md:table-cell">User</TableHead>
                    <TableHead className="hidden sm:table-cell">Clicks</TableHead>
                    <TableHead className="hidden md:table-cell">Sponsors</TableHead>
                    <TableHead className="hidden sm:table-cell">Earnings</TableHead>
                    <TableHead className="hidden md:table-cell">Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredLinks.map((link) => (
                    <TableRow key={link.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedLinks.has(link.id)}
                            onCheckedChange={(checked) => handleSelectLink(link.id, checked as boolean)}
                            aria-label={`Seleccionar enlace ${link.title}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold truncate max-w-[200px] sm:max-w-xs">{link.title}</div>
                          <a href={link.short} target='_blank' rel='noopener noreferrer' className="text-xs text-blue-600 hover:underline block truncate max-w-[200px] sm:max-w-xs">{link.short}</a>
                          {/* Mobile-only details */}
                          <div className="md:hidden mt-2 space-y-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">User:</span>
                              {link.userId ? (
                                <Link href={`/admin/users/${link.userId}`} className="text-blue-600 hover:underline">
                                  {link.userName}
                                </Link>
                              ) : (
                                <span className="text-muted-foreground">{link.userName}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Status:</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  {link.monetizationStatus === 'suspended' ? (
                                    <Badge variant="secondary" className="bg-yellow-500 text-black">Suspended</Badge>
                                  ) : (
                                    <Badge variant={link.monetizable ? 'default' : 'secondary'} className={`h-5 ${link.monetizable ? 'bg-green-600' : ''}`}>
                                      {link.monetizable ? 'Monetizable' : 'Not Monetizable'}
                                    </Badge>
                                  )}
                                </TooltipTrigger>
                                <TooltipContent>
                                  {link.monetizationStatus === 'suspended'
                                    ? 'La monetización de este enlace está suspendida.'
                                    : link.monetizable
                                    ? 'Este enlace es monetizable.'
                                    : 'Este enlace no es monetizable.'}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="flex items-center gap-4 text-xs">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Eye className="h-3 w-3" />
                                <span>{link.clicks} Clicks</span>
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{link.createdAt ? new Date(link.createdAt.seconds * 1000).toLocaleString() : 'N/A'}</span>
                              </div>
                            </div>
                            {/* Mobile sponsors info */}
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Sponsors:</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-2">
                                    {(() => {
                                      const sponsorStats = getSponsorStats(link.id);
                                      return (
                                        <>
                                          <Badge variant={sponsorStats.expired > 0 ? "destructive" : "default"}>
                                            {sponsorStats.active}/{sponsorStats.total}
                                          </Badge>
                                          {sponsorStats.expired > 0 && (
                                            <Badge variant="outline" className="text-orange-600">
                                              {sponsorStats.expired} exp.
                                            </Badge>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {(() => {
                                    const s = getSponsorStats(link.id);
                                    return `Activos: ${s.active}, Expirados: ${s.expired}, Total: ${s.total}`;
                                  })()}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Earnings:</span>
                              <span className="font-bold">${(link.generatedEarnings || 0).toFixed(4)}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {link.userId ? (
                            <Link href={`/admin/users/${link.userId}`} className="font-medium text-blue-600 hover:underline">
                              {link.userName}
                            </Link>
                          ) : (
                            <span className="font-medium">{link.userName}</span>
                          )}
                          <div className="text-xs text-muted-foreground">{link.userEmail}</div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{link.clicks}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2">
                                {(() => {
                                  const sponsorStats = getSponsorStats(link.id);
                                  return (
                                    <>
                                      <Badge variant={sponsorStats.expired > 0 ? "destructive" : "default"}>
                                        {sponsorStats.active}/{sponsorStats.total}
                                      </Badge>
                                      {sponsorStats.expired > 0 && (
                                        <Badge variant="outline" className="text-orange-600">
                                          {sponsorStats.expired} exp.
                                        </Badge>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {(() => {
                                const s = getSponsorStats(link.id);
                                return `Activos: ${s.active}, Expirados: ${s.expired}, Total: ${s.total}`;
                              })()}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell font-bold">${(link.generatedEarnings || 0).toFixed(4)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              {link.monetizationStatus === 'suspended' ? (
                                <Badge variant="secondary" className="bg-yellow-500 text-black">Suspended</Badge>
                              ) : (
                                <Badge variant={link.monetizable ? 'default' : 'secondary'} className={link.monetizable ? 'bg-green-600' : ''}>
                                  {link.monetizable ? 'Monetizable' : 'Not Monetizable'}
                                </Badge>
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              {link.monetizationStatus === 'suspended'
                                ? 'La monetización de este enlace está suspendida.'
                                : link.monetizable
                                ? 'Este enlace es monetizable.'
                                : 'Este enlace no es monetizable.'}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        
                        <TableCell className="hidden lg:table-cell">{link.createdAt ? new Date(link.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell className="text-right">
                             {isAnalyzing && analyzingLinkId === link.id ? (
                                <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                             ) : (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => router.push(`/admin/links/${link.id}`)}>
                                            <BarChart3 className="mr-2 h-4 w-4" />
                                            <span>View Stats</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleAnalyzeLink(link)}>
                                            <ShieldCheck className="mr-2 h-4 w-4" />
                                            <span>Analyze Link</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => window.open(link.short, '_blank')}>
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            <span>View Link</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        
                                        {/* Opción para agregar sponsor */}
                                        <DropdownMenuItem 
                                            onClick={() => handleAddSponsor(link.id)}
                                            disabled={!getSponsorStats(link.id).canAddMore}
                                        >
                                            <Plus className="mr-2 h-4 w-4 text-amber-600" />
                                            <span>Agregar Sponsor</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        
                                        {link.monetizationStatus === 'active' ? (
                                            <DropdownMenuItem onClick={() => handleToggleMonetization(link)}>
                                                <ShieldBan className="mr-2 h-4 w-4 text-destructive" />
                                                <span className="text-destructive">Suspend Monetization</span>
                                            </DropdownMenuItem>
                                        ) : (
                                            <DropdownMenuItem onClick={() => handleToggleMonetization(link)}>
                                                <DollarSign className="mr-2 h-4 w-4 text-green-500" />
                                                <span className="text-green-500">Re-enable Monetization</span>
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(link.id, link.userId, link.title)}>
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            <span>Delete</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                             )}
                        </TableCell>
                    </TableRow>
                ))}
                {filteredLinks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No links found in the system.
                    </TableCell>
                  </TableRow>
                )}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
        </div>

        {/* Diálogo para agregar sponsor individual */}
        {selectedLinkId && (
          <AddSponsorDialog
            linkId={selectedLinkId}
            isOpen={sponsorDialogOpen}
            onClose={() => {
              setSponsorDialogOpen(false);
              setSelectedLinkId(null);
            }}
            onSponsorAdded={handleSponsorAdded}
          />
        )}

        {/* Diálogo para agregar sponsor a múltiples enlaces */}
        {isMultiSponsorDialogOpen && (
          <MultiSponsorDialog
            linkIds={Array.from(selectedLinks)}
            isOpen={isMultiSponsorDialogOpen}
            onClose={() => setIsMultiSponsorDialogOpen(false)}
            onSponsorAdded={handleMultiSponsorAdded}
          />
        )}
    </TooltipProvider>
  );
}
