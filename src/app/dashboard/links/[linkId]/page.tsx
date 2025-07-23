
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
    deviceId: string;
    timestamp: any;
};

type DeviceStat = {
    deviceId: string;
    count: number;
    timestamps: Date[];
};

type LinkData = {
    userId: string;
    title: string;
    original: string;
    clicks: number; // Total Clicks
    realClicks: number; // Real Clicks (calculated from DB)
};

export default function UserLinkStatsPage() {
    const params = useParams();
    const linkId = params.linkId as string;
    const { user, loading: userLoading } = useUser();
    const [linkData, setLinkData] = useState<LinkData | null>(null);
    const [deviceStats, setDeviceStats] = useState<DeviceStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);

    useEffect(() => {
        if (userLoading) return;
        if (!user) {
            setAccessDenied(true); // Should be handled by layout, but as a safeguard
            setLoading(false);
            return;
        };
        if (!linkId) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch link data and verify ownership
                const linkRef = doc(db, 'links', linkId);
                const linkSnap = await getDoc(linkRef);

                if (!linkSnap.exists() || linkSnap.data().userId !== user.uid) {
                    setAccessDenied(true);
                    setLoading(false);
                    return;
                }

                const data = linkSnap.data();
                
                // 2. Fetch all click data for this link
                const clicksQuery = query(
                    collection(db, 'clicks'), 
                    where('linkId', '==', linkId)
                );
                const querySnapshot = await getDocs(clicksQuery);
                const clicks: Click[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Click));

                // 3. Aggregate stats by deviceId
                const deviceCounts = clicks.reduce((acc, click) => {
                    const id = click.deviceId;
                    if (!acc[id]) {
                        acc[id] = { deviceId: id, count: 0, timestamps: [] };
                    }
                    acc[id].count++;
                    acc[id].timestamps.push(new Date(click.timestamp.seconds * 1000));
                    return acc;
                }, {} as { [key: string]: DeviceStat });

                const sortedDeviceStats = Object.values(deviceCounts).sort((a, b) => b.count - a.count);
                
                setDeviceStats(sortedDeviceStats);
                setLinkData({
                    userId: data.userId,
                    title: data.title,
                    original: data.original,
                    clicks: data.clicks,
                    realClicks: data.realClicks || 0,
                });

            } catch (error) {
                console.error("Failed to fetch link stats:", error);
                 setAccessDenied(true);
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
    
    if(accessDenied) {
        notFound();
    }
    
    if(!linkData) {
        // This state can be reached if linkId is invalid but before notFound() is called
        return <p>Link not found or you don't have permission to view it.</p>
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
                         <p className="text-xs text-muted-foreground">Unique devices per hour.</p>
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
                    <CardTitle>Clicks by Device</CardTitle>
                    <CardDescription>A list of unique devices and how many times each has clicked your link.</CardDescription>
                </CardHeader>
                <CardContent>
                   <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Device ID</TableHead>
                                <TableHead className="text-right">Click Count</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {deviceStats.map((stat) => (
                                <TableRow key={stat.deviceId}>
                                    <TableCell className="font-mono text-xs">{stat.deviceId}</TableCell>
                                    <TableCell className="text-right font-semibold">{stat.count}</TableCell>
                                </TableRow>
                            ))}
                            {deviceStats.length === 0 && (
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
