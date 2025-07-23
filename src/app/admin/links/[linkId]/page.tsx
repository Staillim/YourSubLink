
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Eye, User, Check, Bot } from 'lucide-react';
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
    title: string;
    original: string;
    clicks: number; 
    realClicks: number;
    userName: string;
};

export default function LinkStatsPage() {
    const params = useParams();
    const linkId = params.linkId as string;
    const [linkData, setLinkData] = useState<LinkData | null>(null);
    const [deviceStats, setDeviceStats] = useState<DeviceStat[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!linkId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch link and user data
                const linkRef = doc(db, 'links', linkId);
                const linkSnap = await getDoc(linkRef);

                if (!linkSnap.exists()) {
                    setLinkData(null);
                    setLoading(false);
                    return;
                }

                const data = linkSnap.data();
                const userRef = doc(db, 'users', data.userId);
                const userSnap = await getDoc(userRef);
                const userName = userSnap.exists() ? userSnap.data().displayName : 'Unknown User';
                
                // Fetch click data, ordered by timestamp
                const clicksQuery = query(
                    collection(db, 'clicks'), 
                    where('linkId', '==', linkId),
                    orderBy('timestamp', 'desc')
                );
                const querySnapshot = await getDocs(clicksQuery);
                const clicks: Click[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Click));

                // Aggregate stats by device ID
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
                    title: data.title,
                    original: data.original,
                    clicks: data.clicks,
                    realClicks: data.realClicks || 0,
                    userName: userName,
                });

            } catch (error) {
                console.error("Failed to fetch link stats:", error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();

    }, [linkId]);
    
    if (loading) {
        return (
             <div className="flex flex-col gap-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-28" />
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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                    <CardTitle>Clicks by Device</CardTitle>
                    <CardDescription>A list of unique devices and how many times each has clicked the link.</CardDescription>
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
