
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, deleteDoc, getDoc } from 'firebase/firestore';
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
import { MoreVertical, Trash2, ExternalLink, BarChart3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


type Link = {
  id: string;
  title: string;
  original: string;
  shortId: string;
  short: string;
  clicks: number;
  realClicks: number;
  monetizable: boolean;
  createdAt: any;
  userId: string;
  userName?: string;
  userEmail?: string;
};

export default function AdminLinksPage() {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
          short: `${window.location.origin}/${data.shortId}`,
          createdAt: data.createdAt,
          realClicks: data.realClicks || 0,
          userName,
          userEmail
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
                    <TableHead>User</TableHead>
                    <TableHead>Total Clicks</TableHead>
                    <TableHead>Real Clicks</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {links.map((link) => (
                    <TableRow key={link.id}>
                        <TableCell>
                            <div className="font-semibold">{link.title}</div>
                            <a href={link.short} target='_blank' rel='noopener noreferrer' className="text-xs text-muted-foreground hover:underline">{link.short}</a>
                        </TableCell>
                         <TableCell>
                            <div className="font-medium">{link.userName}</div>
                            <div className="text-xs text-muted-foreground">{link.userEmail}</div>
                        </TableCell>
                        <TableCell>{link.clicks}</TableCell>
                        <TableCell>{link.realClicks}</TableCell>
                        <TableCell>
                            <Badge variant={link.monetizable ? 'default' : 'secondary'} className={link.monetizable ? 'bg-green-600' : ''}>
                                {link.monetizable ? 'Monetizable' : 'Not Monetizable'}
                            </Badge>
                        </TableCell>
                        <TableCell>{link.createdAt ? new Date(link.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell className="text-right">
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
                                    <DropdownMenuItem onClick={() => window.open(link.short, '_blank')}>
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        <span>View Link</span>
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
    </TooltipProvider>
  );
}
