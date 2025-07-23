
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Link2, DollarSign, Eye, CheckCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Link = {
    clicks: number;
    realClicks: number;
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
    const [totalLinks, setTotalLinks] = useState<number | null>(null);
    const [totalClicks, setTotalClicks] = useState<number | null>(null);
    const [realClicks, setRealClicks] = useState<number | null>(null);
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
            let realClicksCount = 0;
            let monetizable = 0;
            snapshot.forEach((doc) => {
                const data = doc.data() as Link;
                clicks += data.clicks || 0;
                realClicksCount += data.realClicks || 0;
                if (data.monetizable) {
                    monetizable++;
                }
            });
            setTotalLinks(snapshot.size);
            setTotalClicks(clicks);
            setRealClicks(realClicksCount);
            setTotalRevenue((realClicksCount / 1000) * 3.00); // Revenue based on real clicks
            setMonetizableLinks(monetizable);
            if (loading) setLoading(false);
        });
        
        const unsubPayouts = onSnapshot(payoutsQuery, async (snapshot) => {
            const payoutsData: RecentPayout[] = [];
            for (const payoutDoc of snapshot.docs) {
                const data = payoutDoc.data();
                payoutsData.push({ id: payoutDoc.id, ...data } as RecentPayout);
            }
            setRecentPayouts(payoutsData);
            setPayoutsLoading(false);
        });

        return () => {
            unsubUsers();
            unsubLinks();
            unsubPayouts();
        };
    }, [loading]);

    const stats = [
        { title: 'Total Users', value: userCount, icon: Users, description: 'All registered users' },
        { title: 'Total Links', value: totalLinks, icon: Link2, description: 'All links created' },
        { title: 'Total Clicks', value: totalClicks, icon: Eye, description: 'All page loads' },
        { title: 'Real Clicks', value: realClicks, icon: CheckCircle, description: 'Unique clicks per hour' },
        { title: 'Total Revenue', value: totalRevenue, icon: DollarSign, isCurrency: true, description: `Based on $3.00 CPM on real clicks` },
        { title: 'Monetizable Links', value: monetizableLinks, icon: Link2, description: 'Links with >=3 rules' },
    ];

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                                    {stat.value !== null ? (stat.isCurrency ? stat.value.toFixed(4) : stat.value.toLocaleString()) : '0'}
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                                {stat.description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

             <Card>
                <CardHeader>
                    <CardTitle>Recent Payouts</CardTitle>
                    <CardDescription>The 5 most recently processed payouts.</CardDescription>
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
                                        <TableCell className="text-right font-semibold text-green-500">${payout.amount.toFixed(4)}</TableCell>
                                        <TableCell className="text-right">{new Date(payout.processedAt.seconds * 1000).toLocaleDateString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                   ) : (
                        <p className="text-center text-muted-foreground py-4">Payout history will be displayed here once payments are processed.</p>
                   )}
                </CardContent>
             </Card>
        </div>
    );
}
