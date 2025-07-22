
'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Link as LinkIcon, Loader2, MoreVertical, Trash2, Check, ExternalLink, BadgeHelp, Edit } from 'lucide-react';
import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Rule, RuleEditor } from '@/components/rule-editor';


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
};

export default function DashboardPage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [links, setLinks] = useState<LinkItem[]>([]);
  
  // Create form state
  const [longUrl, setLongUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState<Rule[]>([]);
  
  const [shortenedUrl, setShortenedUrl] = useState<LinkItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState('');
  const { toast } = useToast();
  const [linksLoading, setLinksLoading] = useState(true);

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
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const linksData: LinkItem[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          linksData.push({
            id: doc.id,
            original: data.original,
            shortId: data.shortId,
            short: `${window.location.origin}/${data.shortId}`,
            clicks: data.clicks,
            date: new Date(data.createdAt.seconds * 1000).toISOString().split('T')[0],
            userId: data.userId,
            title: data.title,
            description: data.description,
            monetizable: data.monetizable || false,
            rules: data.rules || [],
          });
        });
        setLinks(linksData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setLinksLoading(false);
      });

      return () => unsubscribe();
    }
  }, [user]);

  if (loading || linksLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md md:px-8">
          <Logo />
          <Skeleton className="h-9 w-9 rounded-full" />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-6 w-1/2" />
          <div className="mt-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                <Skeleton className="h-10 w-32" />
              </CardFooter>
            </Card>
          </div>
        </main>
      </div>
    );
  }
  
  const resetCreateForm = () => {
    setLongUrl('');
    setTitle('');
    setDescription('');
    setRules([]);
  }

  const handleShorten = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!longUrl || !title || !user) return;

    startTransition(async () => {
      setShortenedUrl(null);
      try {
        const shortId = Math.random().toString(36).substring(2, 8);
        const newLink = {
          userId: user.uid,
          original: longUrl,
          shortId: shortId,
          clicks: 0,
          createdAt: new Date(),
          title,
          description,
          rules,
          monetizable: rules.length >= 3,
        };
        const docRef = await addDoc(collection(db, "links"), newLink);
        setShortenedUrl({ 
            ...newLink,
            id: docRef.id,
            short: `${window.location.origin}/${shortId}`,
            date: newLink.createdAt.toISOString().split('T')[0],
        });
        resetCreateForm();
        toast({
            title: "Link Created!",
            description: "Your new link is ready.",
        })
      } catch (error) {
        toast({
          title: "Error creating link",
          description: "There was a problem shortening your link. Please try again.",
          variant: "destructive"
        })
      }
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    toast({
        title: "Copied!",
        description: "The link has been copied to your clipboard.",
        duration: 2000,
    })
    setTimeout(() => setCopied(''), 2000);
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


  return (
    <TooltipProvider>
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md md:px-8">
        <Logo />
        <UserNav />
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Dashboard</h1>
          <p className="text-muted-foreground">
            Create and manage your shortened links.
          </p>
        </div>
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
            <TabsTrigger value="create">
              <LinkIcon className="mr-2 h-4 w-4" /> Create New
            </TabsTrigger>
            <TabsTrigger value="links">My Links</TabsTrigger>
          </TabsList>
          <TabsContent value="create" className="mt-6">
            <Card>
              <form onSubmit={handleShorten}>
                <CardHeader>
                  <CardTitle>Shorten a new link</CardTitle>
                  <CardDescription>
                    Provide the details for your new link below.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g. My YouTube Channel"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="long-url">Destination URL</Label>
                    <Input
                      id="long-url"
                      placeholder="https://example.com/very-long-url-to-shorten"
                      value={longUrl}
                      onChange={(e) => setLongUrl(e.target.value)}
                      required
                    />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="A short description for your link"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Monetization Rules</Label>
                     <p className="text-sm text-muted-foreground">Add at least 3 rules to make this link monetizable.</p>
                    <RuleEditor rules={rules} onRulesChange={setRules} />
                  </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                  <Button type="submit" disabled={isPending} style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }} className="font-semibold">
                    {isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Link
                  </Button>
                </CardFooter>
              </form>
            </Card>
            {shortenedUrl && (
              <Alert className="mt-6">
                <LinkIcon className="h-4 w-4" />
                <AlertTitle className="font-bold">Link Created Successfully!</AlertTitle>
                <AlertDescription className="mt-2 flex items-center justify-between">
                  <span className="truncate pr-4 font-mono text-sm">
                    {shortenedUrl.short}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => handleCopy(shortenedUrl.short)}>
                    {copied === shortenedUrl.short ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          <TabsContent value="links" className="mt-6">
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
                        <TableHead className="w-[35%]">Link Details</TableHead>
                        <TableHead>Short Link</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Clicks</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {links.map((link) => (
                        <TableRow key={link.id} className="hover:bg-muted/50">
                          <TableCell className="max-w-xs font-medium">
                            <div className="flex flex-col gap-1">
                                <span className="truncate font-bold">{link.title}</span>
                                <a href={link.original} target="_blank" rel="noopener noreferrer" className="hover:underline text-muted-foreground text-xs flex items-center gap-1">
                                   {link.original}
                                   <ExternalLink className="h-3 w-3 shrink-0"/>
                                </a>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <a href={link.short} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-primary hover:underline">{link.short}</a>
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
                          <TableCell>{link.clicks}</TableCell>
                          <TableCell className="text-muted-foreground">{link.date}</TableCell>
                          <TableCell className="text-right">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>

    {/* Edit Link Dialog */}
    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Edit Link</DialogTitle>
                <DialogDescription>
                    Update the details of your link here. Changes will be saved automatically.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-title" className="text-right">
                        Title
                    </Label>
                    <Input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-description" className="text-right">
                        Description
                    </Label>
                    <Textarea id="edit-description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                     <Label className="text-right pt-2">
                        Rules
                    </Label>
                    <div className="col-span-3">
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
                <Button onClick={handleUpdateLink} disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </TooltipProvider>
  );
}
