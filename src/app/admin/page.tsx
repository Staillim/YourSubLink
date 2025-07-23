
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Link2, DollarSign, Eye } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const CPM = 3.00; // Cost Per Mille (1000 views)

type Link = {
    clicks: number;
    monetizable: boolean;
};

type RecentPayout = {
    id: string;
    userName: string;
    amount: number;
    processedAt: any;
}

export default function AdminDashboardPage() {
    const [userCount, setUserCount] = useState<number | null>(null);
    const [totalClicks, setTotalClicks] = useState<number | null>(null);
    const [totalRevenue, setTotalRevenue] = useState<number | null>(null);
    const [monetizableLinks, setMonetizableLinks] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [recentPayouts, setRecentPayouts] = useState<RecentPayout[]>([]);
    const [payoutsLoading, setPayoutsLoading] = useState(true);

    useEffect(() => {
        const usersQuery = query(collection(db, 'users'));
        const linksQuery = query(collection(db, 'links'));
        const payoutsQuery = query(
            collection(db, 'payoutRequests'), 
            where('status', '==', 'completed'), 
            orderBy('processedAt', 'desc'),
            limit(5)
        );

        const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
            setUserCount(snapshot.size);
            if (loading) setLoading(false);
        });

        const unsubLinks = onSnapshot(linksQuery, (snapshot) => {
            let clicks = 0;
            let monetizable = 0;
            snapshot.forEach((doc) => {
                const data = doc.data() as Link;
                clicks += data.clicks || 0;
                if (data.monetizable) {
                    monetizable++;
                }
            });
            setTotalClicks(clicks);
            setTotalRevenue((clicks / 1000) * CPM);
            setMonetizableLinks(monetizable);
            if (loading) setLoading(false);
        });
        
        const unsubPayouts = onSnapshot(payoutsQuery, (snapshot) => {
            const payoutsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecentPayout));
            setRecentPayouts(payoutsData);
            setPayoutsLoading(false);
        });

        return () => {
            unsubUsers();
            unsubLinks();
            unsubPayouts();
        };
    }, []);

    const stats = [
        { title: 'Total Users', value: userCount, icon: Users },
        { title: 'Total Clicks', value: totalClicks, icon: Eye },
        { title: 'Total Revenue', value: totalRevenue, icon: DollarSign, isCurrency: true },
        { title: 'Monetizable Links', value: monetizableLinks, icon: Link2 },
    ];

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, index) => (
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
                                    {stat.isCurrency && '$'}
                                    {stat.value !== null ? (stat.isCurrency ? stat.value.toFixed(2) : stat.value.toLocaleString()) : '0'}
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                                {index === 2 ? `Based on $${CPM.toFixed(2)} CPM` : 'Live count'}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

             <Card>
                <CardHeader>
                    <CardTitle>Recent Payouts</CardTitle>
                </CardHeader>
                <CardContent>
                   {payoutsLoading ? (
                       <div className="space-y-4">
                           {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                       </div>
                   ) : recentPayouts.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentPayouts.map((payout) => (
                                    <TableRow key={payout.id}>
                                        <TableCell>
                                            <div className="font-medium">{payout.userName}</div>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold text-green-500">${payout.amount.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">{new Date(payout.processedAt.seconds * 1000).toLocaleDateString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                   ) : (
                        <p className="text-muted-foreground">No recent payouts to display.</p>
                   )}
                </CardContent>
             </Card>
        </div>
    );
}
