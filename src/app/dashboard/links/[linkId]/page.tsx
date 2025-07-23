
'use client';

import { useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Eye, Check, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type Click = {
    id: string;
    ipAddress: string;
    timestamp: any;
};

type IpStat = {
    ip: string;
    count: number;
    timestamps: Date[];
};

type LinkData = {
    userId: string;
    title: string;
    original: string;
    clicks: number; // Total Clicks
    realClicks: number; // Real Clicks (from Firestore)
};

export default function UserLinkStatsPage() {
    const params = useParams();
    const linkId = params.linkId as string;
    const { user, loading: userLoading } = useUser();
    const [linkData, setLinkData] = useState<LinkData | null>(null);
    const [ipStats, setIpStats] = useState<IpStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        if (userLoading) return;
        if (!user) {
            setLoading(false);
            setIsError(true);
            return;
        }
        if (!linkId) {
            setLoading(false);
            setIsError(true);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch link data and verify ownership
                const linkRef = doc(db, 'links', linkId);
                const linkSnap = await getDoc(linkRef);

                if (!linkSnap.exists() || linkSnap.data().userId !== user.uid) {
                    setIsError(true);
                    setLoading(false);
                    return;
                }
                const data = linkSnap.data();
                 setLinkData({
                    userId: data.userId,
                    title: data.title,
                    original: data.original,
                    clicks: data.clicks || 0,
                    realClicks: data.realClicks || 0,
                });

                // 2. If ownership is confirmed, fetch clicks
                const clicksQuery = query(collection(db, 'clicks'), where('linkId', '==', linkId), orderBy('timestamp', 'desc'));
                const querySnapshot = await getDocs(clicksQuery);
                const clicks: Click[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Click));

                const ipCounts = clicks.reduce((acc, click) => {
                    if(!click.ipAddress) return acc;
                    const ip = click.ipAddress;
                    if (!acc[ip]) {
                        acc[ip] = { ip: ip, count: 0, timestamps: [] };
                    }
                    acc[ip].count++;
                    if(click.timestamp?.seconds) {
                        acc[ip].timestamps.push(new Date(click.timestamp.seconds * 1000));
                    }
                    return acc;
                }, {} as { [key: string]: IpStat });

                const sortedIpStats = Object.values(ipCounts).sort((a, b) => b.count - a.count);
                
                setIpStats(sortedIpStats);
            } catch (error) {
                console.error("Failed to fetch link stats:", error);
                setIsError(true);
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();

    }, [linkId, user, userLoading]);

    if (loading || userLoading) {
        return (
             <div className="flex flex-col gap-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                </div>
                <Skeleton className="h-80" />
            </div>
        );
    }
    
    if(isError || !linkData) {
        return notFound();
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/dashboard">
                        <ArrowLeft />
                    </Link>
                </Button>
                <h1 className="text-2xl font-bold truncate">Stats for "{linkData.title}"</h1>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{linkData.clicks.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Every single page load.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Real Clicks</CardTitle>
                        <Check className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{linkData.realClicks.toLocaleString()}</div>
                         <p className="text-xs text-muted-foreground">Unique clicks per hour.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Bot Clicks (est.)</CardTitle>
                        <Bot className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(linkData.clicks - linkData.realClicks).toLocaleString()}</div>
                         <p className="text-xs text-muted-foreground">Difference between total & real.</p>
                    </CardContent>
                </Card>
            </div>
            
             <Card>
                <CardHeader>
                    <CardTitle>Clicks by IP Address</CardTitle>
                    <CardDescription>A list of unique IP addresses and how many times each has clicked your link.</CardDescription>
                </CardHeader>
                <CardContent>
                   <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>IP Address</TableHead>
                                <TableHead className="text-right">Click Count</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ipStats.map((stat) => (
                                <TableRow key={stat.ip}>
                                    <TableCell className="font-mono">{stat.ip}</TableCell>
                                    <TableCell className="text-right font-semibold">{stat.count}</TableCell>
                                </TableRow>
                            ))}
                            {ipStats.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={2} className="h-24 text-center">
                                        No click data available for this link yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                   </Table>
                </CardContent>
            </Card>

        </div>
    );
}
