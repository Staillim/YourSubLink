
'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, ExternalLink, Eye, User, Hash } from 'lucide-react';
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
};

type LinkData = {
    title: string;
    original: string;
    clicks: number;
    userName: string;
};

export default function LinkStatsPage({ params }: { params: { linkId: string } }) {
    const { linkId } = params;
    const [linkData, setLinkData] = useState<LinkData | null>(null);
    const [ipStats, setIpStats] = useState<IpStat[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!linkId) return;

        const fetchLinkData = async () => {
            const linkRef = doc(db, 'links', linkId);
            const linkSnap = await getDoc(linkRef);

            if (linkSnap.exists()) {
                const data = linkSnap.data();
                const userRef = doc(db, 'users', data.userId);
                const userSnap = await getDoc(userRef);
                const userName = userSnap.exists() ? userSnap.data().displayName : 'Unknown User';

                setLinkData({
                    title: data.title,
                    original: data.original,
                    clicks: data.clicks,
                    userName: userName,
                });
            }
        };

        const fetchClickStats = async () => {
            const clicksQuery = query(collection(db, 'clicks'), where('linkId', '==', linkId), orderBy('timestamp', 'desc'));
            const querySnapshot = await getDocs(clicksQuery);
            const clicks: Click[] = [];
            querySnapshot.forEach((doc) => {
                clicks.push({ id: doc.id, ...doc.data() } as Click);
            });

            const ipCounts = clicks.reduce((acc, click) => {
                acc[click.ipAddress] = (acc[click.ipAddress] || 0) + 1;
                return acc;
            }, {} as { [key: string]: number });

            const sortedIpStats = Object.entries(ipCounts)
                .map(([ip, count]) => ({ ip, count }))
                .sort((a, b) => b.count - a.count);

            setIpStats(sortedIpStats);
        };
        
        setLoading(true);
        Promise.all([fetchLinkData(), fetchClickStats()]).finally(() => setLoading(false));

    }, [linkId]);
    
    if (loading) {
        return (
             <div className="flex flex-col gap-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                </div>
                <Skeleton className="h-80" />
            </div>
        );
    }
    
    if(!linkData) {
        return <p>Link not found.</p>
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/admin/links">
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
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unique IPs</CardTitle>
                        <Hash className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{ipStats.length.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Created By</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">{linkData.userName}</div>
                    </CardContent>
                </Card>
            </div>
            
             <Card>
                <CardHeader>
                    <CardTitle>Clicks by IP Address</CardTitle>
                    <CardDescription>A list of unique IP addresses and how many times each has clicked the link.</CardDescription>
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

