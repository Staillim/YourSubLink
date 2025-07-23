
'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Copy, Link as LinkIcon, Loader2, MoreVertical, Trash2, ExternalLink, BadgeHelp, Edit, PlusCircle, BarChart3 } from 'lucide-react';
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


type Click = {
    id: string;
    visitorId: string;
    timestamp: any;
};

export type LinkItem = {
  id: string;
  original: string;
  shortId: string;
  short: string;
  clicks: number;
  realClicks: number;
  date: string;
  userId: string;
  title: string;
  description?: string;
  monetizable: boolean;
  rules: Rule[];
  generatedEarnings: number;
};

const calculateRealClicks = (clicks: Click[]): number => {
    if (clicks.length === 0) return 0;

    const clicksByVisitor: { [key: string]: Date[] } = {};
    clicks.forEach(click => {
        if (!clicksByVisitor[click.visitorId]) {
            clicksByVisitor[click.visitorId] = [];
        }
        clicksByVisitor[click.visitorId].push(new Date(click.timestamp.seconds * 1000));
    });

    let realClickCount = 0;
    for (const visitorId in clicksByVisitor) {
        const timestamps = clicksByVisitor[visitorId].sort((a,b) => a.getTime() - b.getTime());
        let lastCountedTimestamp: Date | null = null;

        timestamps.forEach(timestamp => {
            if (!lastCountedTimestamp || (timestamp.getTime() - lastCountedTimestamp.getTime()) > 3600000) { // 1 hour in ms
                realClickCount++;
                lastCountedTimestamp = timestamp;
            }
        });
    }

    return realClickCount;
}

export default function DashboardPage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
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
            
            // Fetch clicks for each link to calculate real clicks
            const clicksQuery = query(collection(db, 'clicks'), where('linkId', '==', docSnapshot.id));
            const clicksSnapshot = await getDocs(clicksQuery);
            const clicks: Click[] = clicksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Click));
            const realClicks = calculateRealClicks(clicks);

            linksData.push({
                id: docSnapshot.id,
                original: data.original,
                shortId: data.shortId,
                short: `${window.location.origin}/${data.shortId}`,
                clicks: data.clicks,
                realClicks: realClicks,
                date: new Date(data.createdAt.seconds * 1000).toISOString().split('T')[0],
                userId: data.userId,
                title: data.title,
                description: data.description,
                monetizable: data.monetizable || false,
                rules: data.rules || [],
                generatedEarnings: data.generatedEarnings || 0,
            });
        }
        setLinks(linksData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setLinksLoading(false);
      });

      return () => unsubscribe();
    }
  }, [user]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
        title: "Copied!",
        description: "The link has been copied to your clipboard.",
        duration: 2000,
    })
  };
  
  const handleDelete = async (id: string) => {
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
                monetizable: editRules.length >= 3
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

  if (loading || linksLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
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
            <Button onClick={() => router.push('/dashboard/create')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Link
            </Button>
        </div>
        <div className="grid gap-6">
             <Card>
                <CardHeader>
                    <CardTitle>My Links</CardTitle>
                    <CardDescription>
                    Here are all the links you've created.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="w-full md:w-2/5">Link</TableHead>
                            <TableHead className="hidden md:table-cell">Short Link</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Real Clicks</TableHead>
                            <TableHead className="hidden md:table-cell">Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {links.map((link) => (
                            <TableRow key={link.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                                <div className="flex flex-col gap-1">
                                    <span className="truncate font-bold">{link.title}</span>
                                    <a href={link.original} target="_blank" rel="noopener noreferrer" className="hidden md:flex hover:underline text-muted-foreground text-xs items-center gap-1">
                                        <span className="truncate">{link.original}</span>
                                        <ExternalLink className="h-3 w-3 shrink-0"/>
                                    </a>
                                </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                                <div className="flex items-center gap-2">
                                <a href={link.short} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-primary hover:underline">{link.short.replace('https://','')}</a>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant={link.monetizable ? 'default' : 'secondary'} className={link.monetizable ? 'bg-green-600' : ''}>
                                    <Tooltip>
                                        <TooltipTrigger className="flex items-center gap-1">
                                            {link.monetizable ? 'Monetizable' : 'Not Monetizable'}
                                            <BadgeHelp className="h-3 w-3"/>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{link.monetizable ? 'This link is eligible for monetization.' : `This link needs at least ${3 - link.rules.length} more rule(s) to be monetizable.`}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </Badge>
                            </TableCell>
                            <TableCell>{link.realClicks}</TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground">{link.date}</TableCell>
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
                         {links.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">
                                No links created yet.
                                </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                    </div>
                </CardContent>
            </Card>
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
