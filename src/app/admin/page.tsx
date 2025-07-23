
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Link2, DollarSign, Eye, ArrowRight, CheckCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type LinkData = {
    clicks: number;
    realClicks: number;
    monetizable: boolean;
};

type PayoutRequest = {
    id: string;
    userName: string;
    amount: number;
    status: 'pending' | 'completed' | 'rejected';
    requestedAt: any;
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState({
        userCount: null as number | null,
        totalLinks: null as number | null,
        allClicks: null as number | null,
        realClicks: null as number | null,
        totalRevenue: null as number | null,
    });
    const [recentPayouts, setRecentPayouts] = useState<PayoutRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [payoutsLoading, setPayoutsLoading] = useState(true);

    useEffect(() => {
        const usersQuery = query(collection(db, 'users'));
        const linksQuery = query(collection(db, 'links'));
        const payoutsQuery = query(collection(db, 'payoutRequests'), orderBy('requestedAt', 'desc'), limit(5));

        const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
            setStats(prev => ({...prev, userCount: snapshot.size}));
            setLoading(false);
        });

        const unsubLinks = onSnapshot(linksQuery, (snapshot) => {
            let allClicks = 0;
            let realClicks = 0;
            snapshot.forEach((doc) => {
                const data = doc.data() as LinkData;
                allClicks += data.clicks || 0;
                realClicks += data.realClicks || 0;
            });
            
            const CPM = 3.00;
            setStats(prev => ({
                ...prev,
                totalLinks: snapshot.size,
                allClicks: allClicks,
                realClicks: realClicks,
                totalRevenue: (realClicks / 1000) * CPM
            }));
            setLoading(false);
        });
        
        const unsubPayouts = onSnapshot(payoutsQuery, (snapshot) => {
            const payoutsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayoutRequest));
            setRecentPayouts(payoutsData);
            setPayoutsLoading(false);
        });

        return () => {
            unsubUsers();
            unsubLinks();
            unsubPayouts();
        };
    }, []);

    const statCards = [
        { title: 'Total Users', value: stats.userCount, icon: Users, description: 'All registered users.' },
        { title: 'Total Links', value: stats.totalLinks, icon: Link2, description: 'All links created.' },
        { title: 'All Clicks', value: stats.allClicks, icon: Eye, description: 'Every single page load.' },
        { title: 'Real Clicks', value: stats.realClicks, icon: CheckCircle, description: 'Unique clicks (eligible for payout).'},
    ];
    
    const revenueCard = { title: 'Total Revenue', value: stats.totalRevenue, icon: DollarSign, description: `Based on Real Clicks & $3.00 CPM`, isCurrency: true };


    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat, index) => (
                    <Card key={index}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                            <stat.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <Skeleton className="h-8 w-3/4" />
                            ) : (
                                <div className="text-2xl font-bold">
                                    {stat.value !== null ? stat.value.toLocaleString() : '0'}
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                                {stat.description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{revenueCard.title}</CardTitle>
                        <revenueCard.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Skeleton className="h-8 w-3/4" />
                        ) : (
                            <div className="text-2xl font-bold">
                                ${stats.totalRevenue !== null ? stats.totalRevenue.toFixed(2) : '0.00'}
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                            {revenueCard.description}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Payouts</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {payoutsLoading ? (
                            <div className="p-6">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            {[...Array(4)].map((_,i) => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {[...Array(2)].map((_, i) => (
                                            <TableRow key={i}>
                                                {[...Array(4)].map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentPayouts.slice(0, 3).map((req) => (
                                    <TableRow key={req.id}>
                                        <TableCell className="font-medium">{req.userName}</TableCell>
                                        <TableCell>${req.amount.toFixed(2)}</TableCell>
                                        <TableCell>{new Date(req.requestedAt.seconds * 1000).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <Badge variant={req.status === 'pending' ? 'secondary' : req.status === 'completed' ? 'default' : 'destructive'}
                                                className={req.status === 'completed' ? 'bg-green-600' : ''}>
                                                {req.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {recentPayouts.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            No recent payouts found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-end border-t pt-4">
                        <Button asChild size="sm" variant="outline">
                            <Link href="/admin/payout-requests">
                                View All Payouts
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
