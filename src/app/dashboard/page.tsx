

/**
 * !! ANTES DE EDITAR ESTE ARCHIVO, REVISA LAS DIRECTRICES EN LOS SIGUIENTES DOCUMENTOS: !!
 * - /README.md
 * - /src/AGENTS.md
 * 
 * Este es el dashboard principal del usuario, donde gestiona sus enlaces.
 * Un cambio incorrecto aquí puede afectar la capacidad del usuario para ver o interactuar con sus datos.
 */

'use client';

import { useState, useTransition, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Copy, Link as LinkIcon, Loader2, MoreVertical, Trash2, ExternalLink, BadgeHelp, Edit, PlusCircle, BarChart3, DollarSign, Calendar, Eye, ShieldCheck, ShieldX, ShieldQuestion, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Rule, RuleEditor } from '@/components/rule-editor';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


export type LinkItem = {
  id: string;
  original: string;
  shortId: string;
  short: string;
  clicks: number;
  date: string;
  userId: string;
  title: string;
  description?: string;
  monetizable: boolean;
  rules: Rule[];
  generatedEarnings: number;
  monetizationStatus: 'active' | 'suspended';
};

const TABS = [
    { id: 'all', label: 'Todos', icon: LinkIcon },
    { id: 'monetizable', label: 'Monetizable', icon: ShieldCheck },
    { id: 'not-monetizable', label: 'Not Monetizable', icon: ShieldX },
    { id: 'suspended', label: 'Suspended', icon: ShieldQuestion }
];


function DashboardPageComponent() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [links, setLinks] = useState<LinkItem[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);
  
  const [isPending, startTransition] = useTransition();

  // Edit Dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editRules, setEditRules] = useState<Rule[]>([]);


  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);
  
  useEffect(() => {
    if (user) {
      setLinksLoading(true);
      const q = query(collection(db, "links"), where("userId", "==", user.uid));
      const unsubscribe = onSnapshot(q, async (querySnapshot) => {
        const linksData: LinkItem[] = [];
        for (const docSnapshot of querySnapshot.docs) {
            const data = docSnapshot.data();

            linksData.push({
                id: docSnapshot.id,
                original: data.original,
                shortId: data.shortId,
                short: `${window.location.origin}/link/${data.shortId}`,
                clicks: data.clicks,
                date: new Date(data.createdAt.seconds * 1000).toISOString().split('T')[0],
                userId: data.userId,
                title: data.title,
                description: data.description,
                monetizable: data.monetizable || false,
                rules: data.rules || [],
                generatedEarnings: data.generatedEarnings || 0,
                monetizationStatus: data.monetizationStatus || 'active',
            });
        }
        setLinks(linksData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setLinksLoading(false);
      });

      return () => unsubscribe();
    }
  }, [user]);

  const { monetizableLinks, notMonetizableLinks, suspendedLinks } = useMemo(() => {
    const monetizableLinks = links.filter(link => link.monetizable && link.monetizationStatus === 'active');
    const notMonetizableLinks = links.filter(link => !link.monetizable && link.monetizationStatus === 'active');
    const suspendedLinks = links.filter(link => link.monetizationStatus === 'suspended');
    return { monetizableLinks, notMonetizableLinks, suspendedLinks };
  }, [links]);


  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
        title: "Copied!",
        description: "The link has been copied to your clipboard.",
        duration: 2000,
    })
  };
  
  const handleDelete = async (id: string) => {
    if(!confirm("Are you sure you want to delete this link? This action cannot be undone.")) return;
    try {
        await deleteDoc(doc(db, "links", id));
        toast({
            title: "Link deleted",
            description: "The link has been permanently removed.",
            variant: "destructive",
            duration: 3000,
        })
    } catch (error) {
        toast({
            title: "Error deleting link",
            description: "There was an error deleting the link. Please try again.",
            variant: "destructive"
        })
    }
  };

  const openEditDialog = (link: LinkItem) => {
    setEditingLink(link);
    setEditTitle(link.title);
    setEditDescription(link.description || '');
    setEditRules(link.rules || []);
    setIsEditDialogOpen(true);
  }

  const handleUpdateLink = async () => {
    if (!editingLink) return;

    startTransition(async () => {
        try {
            const linkRef = doc(db, "links", editingLink.id);
            await updateDoc(linkRef, {
                title: editTitle,
                description: editDescription,
                rules: editRules,
                monetizable: editRules.length >= 3,
            });
            setIsEditDialogOpen(false);
            setEditingLink(null);
            toast({
                title: "Link updated",
                description: "Your link has been successfully updated.",
            });
        } catch (error) {
             toast({
                title: "Error updating link",
                description: "There was a problem updating your link.",
                variant: "destructive"
            });
        }
    });
  }

  const renderLinksTable = (linksToRender: LinkItem[], category: string) => {
    if (linksToRender.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-12">
                <p>No links in the "{category}" category.</p>
            </div>
        )
    }
    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-full md:w-2/5">Link</TableHead>
                    <TableHead className="hidden md:table-cell">Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Clicks</TableHead>
                    <TableHead className="hidden sm:table-cell">Earnings</TableHead>
                    <TableHead className="hidden lg:table-cell">Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {linksToRender.map((link) => (
                    <TableRow key={link.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                            <span className="font-bold truncate max-w-[200px] sm:max-w-xs">{link.title}</span>
                            <div className="flex items-center gap-2">
                                <a href={link.short} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-primary hover:underline block truncate max-w-[200px] sm:max-w-xs">{link.short.replace('https://','')}</a>
                            </div>
                        </div>
                        {/* Mobile-only details */}
                        <div className="md:hidden mt-2 space-y-2 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Status:</span>
                                <div className="flex items-center gap-1">
                                    {link.monetizationStatus === 'suspended' ? (
                                        <Badge variant="secondary" className="h-5 bg-yellow-500 text-black">Suspended</Badge>
                                    ) : (
                                        <Badge variant={link.monetizable ? 'default' : 'secondary'} className={`h-5 ${link.monetizable ? 'bg-green-600' : ''}`}>
                                            {link.monetizable ? 'Monetizable' : 'Not Monetizable'}
                                        </Badge>
                                    )}
                                    {link.monetizationStatus === 'suspended' && (
                                          <Tooltip>
                                              <TooltipTrigger asChild>
                                                  <button>
                                                      <BadgeHelp className="h-4 w-4 text-muted-foreground"/>
                                                  </button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                  <p>Monetization for this link has been suspended due to suspicious activity. <br/> If you believe this is an error, please contact support.</p>
                                              </TooltipContent>
                                          </Tooltip>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <Eye className="h-3 w-3" />
                                    <span>{link.clicks} Clicks</span>
                                </div>
                                 <div className="flex items-center gap-1 text-muted-foreground">
                                    <DollarSign className="h-3 w-3" />
                                    <span>${link.generatedEarnings.toFixed(4)}</span>
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    <span>{link.date}</span>
                                </div>
                            </div>
                        </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                            {link.monetizationStatus === 'suspended' ? (
                                <Badge variant="secondary" className="bg-yellow-500 text-black">Suspended</Badge>
                            ) : (
                                <Badge variant={link.monetizable ? 'default' : 'secondary'} className={link.monetizable ? 'bg-green-600' : ''}>
                                    {link.monetizable ? 'Monetizable' : 'Not Monetizable'}
                                </Badge>
                            )}
                            {link.monetizationStatus === 'suspended' ? (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                          <button>
                                              <BadgeHelp className="h-4 w-4 text-muted-foreground"/>
                                          </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="max-w-xs">Monetization for this link has been suspended due to suspicious activity. If you believe this is an error, please contact support.</p>
                                    </TooltipContent>
                                </Tooltip>
                            ) : (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                       <button>
                                          <BadgeHelp className="h-4 w-4 text-muted-foreground"/>
                                       </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{link.monetizable ? 'This link is eligible for monetization.' : `This link needs at least ${3 - link.rules.length} more rule(s) to be monetizable.`}</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{link.clicks}</TableCell>
                    <TableCell className="font-semibold text-green-500 hidden sm:table-cell">${link.generatedEarnings.toFixed(4)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{link.date}</TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/links/${link.id}`)}>
                                <BarChart3 className="mr-2 h-4 w-4" />
                                <span>View Stats</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(link)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCopy(link.short)}>
                                <Copy className="mr-2 h-4 w-4" />
                                <span>Copy</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(link.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                            </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </div>
    );
  }

  const tabParam = searchParams.get('tab');
  const activeTab = useMemo(() => TABS.find(t => t.id === tabParam) || TABS[0], [tabParam]);
  
  const handleTabChange = (tabId: string) => {
    router.push(`/dashboard?tab=${tabId}`);
  };

  if (loading || linksLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-10 w-10 sm:w-36" />
        </div>
        <div className="grid gap-6">
            <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold md:text-2xl">My Links</h1>
          <Button onClick={() => router.push('/dashboard/create')} size="default">
              <PlusCircle className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Create New Link</span>
          </Button>
      </div>
      <div className="grid gap-6">
            <Tabs defaultValue={activeTab.id} onValueChange={handleTabChange} className="w-full">
                {/* Desktop Tabs */}
                <TabsList className="hidden md:grid w-full grid-cols-4">
                    {TABS.map(tab => (
                        <TabsTrigger key={tab.id} value={tab.id}>
                           <tab.icon className="mr-2"/> {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
                {/* Mobile Dropdown */}
                <div className="md:hidden">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-between">
                                {activeTab.label}
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-full">
                            {TABS.map(tab => (
                                <DropdownMenuItem key={tab.id} onClick={() => handleTabChange(tab.id)}>
                                    <tab.icon className="mr-2"/> {tab.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                
                <TabsContent value="all">
                    <Card>
                        <CardHeader>
                            <CardTitle>All Links</CardTitle>
                            <CardDescription>
                                A complete list of all your created links.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                           {renderLinksTable(links, "All")}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="monetizable">
                    <Card>
                        <CardHeader>
                            <CardTitle>Monetizable Links</CardTitle>
                            <CardDescription>
                                These links are active and generating revenue.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                           {renderLinksTable(monetizableLinks, "Monetizable")}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="not-monetizable">
                    <Card>
                        <CardHeader>
                            <CardTitle>Not Monetizable Links</CardTitle>
                            <CardDescription>
                                These links are active, but need 3 or more rules to generate revenue.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {renderLinksTable(notMonetizableLinks, "Not Monetizable")}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="suspended">
                     <Card>
                        <CardHeader>
                            <CardTitle>Suspended Links</CardTitle>
                            <CardDescription>
                                Monetization for these links has been paused due to suspicious activity.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {renderLinksTable(suspendedLinks, "Suspended")}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
      </div>

      {/* Edit Link Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
              <form onSubmit={(e) => { e.preventDefault(); handleUpdateLink(); }}>
                  <DialogHeader>
                      <DialogTitle>Edit Link</DialogTitle>
                      <DialogDescription>
                          Update the details of your link here. Click save when you're done.
                      </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-y-4 py-4">
                      <div className="space-y-2">
                          <Label htmlFor="edit-title">
                              Title
                          </Label>
                          <Input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="edit-description">
                              Description
                          </Label>
                          <Textarea id="edit-description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                      </div>
                       <div className="space-y-2">
                          <Label>
                              Rules
                          </Label>
                          <div >
                              <p className="text-sm text-muted-foreground mb-2">Add at least 3 rules to make this link monetizable.</p>
                              <RuleEditor rules={editRules} onRulesChange={setEditRules} />
                          </div>
                      </div>
                  </div>
                  <DialogFooter>
                      <DialogClose asChild>
                          <Button type="button" variant="secondary">
                              Cancel
                          </Button>
                      </DialogClose>
                      <Button type="submit" disabled={isPending}>
                          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Changes
                      </Button>
                  </DialogFooter>
              </form>
          </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DashboardPageComponent />
        </Suspense>
    )
}
