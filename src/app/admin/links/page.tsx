
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';
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
import { toast } from '@/hooks/use-toast';
import { MoreVertical, Trash2, ExternalLink, BarChart3, Eye, Calendar, ShieldCheck, Loader2, DollarSign, ShieldBan } from 'lucide-react';
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
};

export default function AdminLinksPage() {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [isAnalyzing, startTransition] = useTransition();
  const [analyzingLinkId, setAnalyzingLinkId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'links'), async (snapshot) => {
      setLoading(true);
      const linksData: Link[] = [];
      for (const linkDoc of snapshot.docs) {
        const data = linkDoc.data();
        let userName = 'N/A';
        let userEmail = 'N/A'

        if(data.userId) {
            const userRef = doc(db, 'users', data.userId);
            const userSnap = await getDoc(userRef);
            if(userSnap.exists()){
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
        } as Link);
      }
      setLinks(linksData.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if(!confirm('Are you sure you want to delete this link permanently?')) return;
    try {
        await deleteDoc(doc(db, "links", id));
        toast({
            title: "Link deleted",
            description: "The link has been permanently removed.",
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
        const linkRef = doc(db, 'links', link.id);
        await updateDoc(linkRef, { monetizationStatus: newStatus });

        // Update local state to reflect the change immediately
        setLinks(prevLinks => 
            prevLinks.map(l => 
                l.id === link.id ? { ...l, monetizationStatus: newStatus } : l
            )
        );

        toast({
            title: 'Monetization Updated',
            description: `Monetization for "${link.title}" has been ${newStatus}.`,
        });
    } catch (error) {
        toast({
            title: 'Error',
            description: 'Could not update monetization status.',
            variant: 'destructive',
        });
    }
  };

  const handleAnalyzeLink = (link: Link) => {
    startTransition(async () => {
        setAnalyzingLinkId(link.id);
        try {
            const result = await analyzeLinkSecurity({ linkId: link.id });
            if (result.isSuspicious) {
                if (result.riskLevel === 'high') {
                    const linkRef = doc(db, 'links', link.id);
                    await updateDoc(linkRef, { monetizationStatus: 'suspended' });
                     // Update local state
                     setLinks(prevLinks => prevLinks.map(l => l.id === link.id ? { ...l, monetizationStatus: 'suspended' } : l));
                    toast({
                        title: 'Analysis Complete: High Risk',
                        description: `Monetization for "${link.title}" has been suspended. Reason: ${result.reason}`,
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

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Link Management</h1>
        <Card>
          <CardHeader>
             <Skeleton className="h-6 w-48" />
             <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        {[...Array(6)].map((_,i) => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(5)].map((_, i) => (
                         <TableRow key={i}>
                             {[...Array(6)].map((_,j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
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
        <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Link Management</h1>
        <Card>
            <CardHeader>
            <CardTitle>All Links</CardTitle>
            <CardDescription>View and manage all links in the system.</CardDescription>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Link</TableHead>
                    <TableHead className="hidden md:table-cell">User</TableHead>
                    <TableHead className="hidden sm:table-cell">Clicks</TableHead>
                    <TableHead className="hidden md:table-cell">Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {links.map((link) => (
                    <TableRow key={link.id}>
                        <TableCell>
                            <div className="flex items-center gap-2">
                               {link.monetizationStatus === 'suspended' && (
                                   <Tooltip>
                                        <TooltipTrigger>
                                             <div className="w-2 h-2 rounded-full bg-red-500" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Monetization suspended</p>
                                        </TooltipContent>
                                    </Tooltip>
                               )}
                                <div className="font-semibold truncate max-w-[200px] sm:max-w-xs">{link.title}</div>
                            </div>
                            <a href={link.short} target='_blank' rel='noopener noreferrer' className="text-xs text-muted-foreground hover:underline block truncate max-w-[200px] sm:max-w-xs">{link.short}</a>
                            {/* Mobile-only details */}
                            <div className="md:hidden mt-2 space-y-2 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">User:</span>
                                    <div className="text-muted-foreground">{link.userName}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">Status:</span>
                                    <Badge variant={link.monetizable ? 'default' : 'secondary'} className={`h-5 ${link.monetizable ? 'bg-green-600' : ''}`}>
                                        {link.monetizable ? 'Monetizable' : 'Not Monetizable'}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                        <Eye className="h-3 w-3" />
                                        <span>{link.clicks} Clicks</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                        <Calendar className="h-3 w-3" />
                                        <span>{link.createdAt ? new Date(link.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </TableCell>
                         <TableCell className="hidden md:table-cell">
                            <div className="font-medium">{link.userName}</div>
                            <div className="text-xs text-muted-foreground">{link.userEmail}</div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{link.clicks}</TableCell>
                        <TableCell className="hidden md:table-cell">
                            <Badge variant={link.monetizable ? 'default' : 'secondary'} className={link.monetizable ? 'bg-green-600' : ''}>
                                {link.monetizable ? 'Monetizable' : 'Not Monetizable'}
                            </Badge>
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
                                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(link.id)}>
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            <span>Delete</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                             )}
                        </TableCell>
                    </TableRow>
                ))}
                 {links.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                    No links found in the system.
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
