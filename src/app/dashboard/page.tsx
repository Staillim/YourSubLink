
'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Link as LinkIcon, Loader2, MoreVertical, Trash2, Check, ExternalLink } from 'lucide-react';
import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

type LinkItem = {
  id: string;
  original: string;
  short: string;
  clicks: number;
  date: string;
};

const mockLinksData: LinkItem[] = [
  { id: '1a2b3c', original: 'https://github.com/shadcn-ui/ui', short: 'https://ys.link/gitui', clicks: 1204, date: '2024-05-20' },
  { id: '4d5e6f', original: 'https://tailwindcss.com/docs/installation', short: 'https://ys.link/twdocs', clicks: 873, date: '2024-05-18' },
  { id: '7g8h9i', original: 'https://vercel.com/docs/concepts/next.js/overview', short: 'https://ys.link/vnext', clicks: 541, date: '2024-05-15' },
  { id: 'j1k2l3', original: 'https://react.dev/learn', short: 'https://ys.link/rlearn', clicks: 2198, date: '2024-05-12' },
];

export default function DashboardPage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [links, setLinks] = useState<LinkItem[]>(mockLinksData);
  const [longUrl, setLongUrl] = useState('');
  const [shortenedUrl, setShortenedUrl] = useState<LinkItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
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

  const handleShorten = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!longUrl) return;

    startTransition(() => {
      setShortenedUrl(null);
      setTimeout(() => {
        const newId = Math.random().toString(36).substring(2, 8);
        const newLink: LinkItem = {
          id: newId,
          original: longUrl,
          short: `https://ys.link/${newId}`,
          clicks: 0,
          date: new Date().toISOString().split('T')[0],
        };
        setLinks(prev => [newLink, ...prev]);
        setShortenedUrl(newLink);
        setLongUrl('');
      }, 1000);
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
  
  const handleDelete = (id: string) => {
    setLinks(links.filter(link => link.id !== id));
    toast({
        title: "Link deleted",
        description: "The link has been permanently removed.",
        variant: "destructive",
        duration: 3000,
    })
  }

  return (
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
                  <CardTitle>Shorten a long URL</CardTitle>
                  <CardDescription>
                    Paste your long URL below to create a short and sweet link.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="long-url" className="sr-only">
                      Long URL
                    </Label>
                    <Input
                      id="long-url"
                      placeholder="https://example.com/very-long-url-to-shorten"
                      value={longUrl}
                      onChange={(e) => setLongUrl(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                  <Button type="submit" disabled={isPending} style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }} className="font-semibold">
                    {isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Shorten Link
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
                        <TableHead className="w-[40%]">Original URL</TableHead>
                        <TableHead>Short Link</TableHead>
                        <TableHead>Clicks</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {links.map((link) => (
                        <TableRow key={link.id} className="hover:bg-muted/50">
                          <TableCell className="max-w-xs truncate font-medium">
                            <a href={link.original} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-2">
                               {link.original}
                               <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0"/>
                            </a>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <a href={link.short} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-primary hover:underline">{link.short}</a>
                            </div>
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
  );
}
