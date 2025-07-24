
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, getDocs, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Link2, DollarSign, Eye } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type Link = {
    clicks: number;
    monetizable: boolean;
    generatedEarnings: number;
};

type PayoutRequest = {
  id: string;
  userName: string;
  amount: number;
  status: 'pending' | 'completed' | 'rejected';
  processedAt: any;
};

export default function AdminDashboardPage() {
    const [userCount, setUserCount] = useState<number | null>(null);
    const [totalClicks, setTotalClicks] = useState<number | null>(null);
    const [totalRevenue, setTotalRevenue] = useState<number | null>(null);
    const [monetizableLinks, setMonetizableLinks] = useState<number | null>(null);
    const [monetizableClicks, setMonetizableClicks] = useState<number | null>(null);
    const [activeCpm, setActiveCpm] = useState<number>(3.00); // Default CPM
    const [recentPayouts, setRecentPayouts] = useState<PayoutRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const usersQuery = query(collection(db, 'users'));
        const linksQuery = query(collection(db, 'links'));
        const cpmQuery = query(collection(db, 'cpmHistory'), where('endDate', '==', null));
        // Simplified query to avoid composite index requirement.
        // We will filter out 'pending' status on the client side.
        const payoutsQuery = query(
            collection(db, 'payoutRequests'), 
            orderBy('processedAt', 'desc'), 
            limit(10) // Fetch a bit more to ensure we get 5 non-pending
        );

        const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
            setUserCount(snapshot.size);
            if(loading) setLoading(false);
        });

        const unsubLinks = onSnapshot(linksQuery, (snapshot) => {
            let clicks = 0;
            let monetizable = 0;
            let revenue = 0;
            let monetizableClicksCount = 0;
            snapshot.forEach((doc) => {
                const data = doc.data() as Link;
                clicks += data.clicks || 0;
                if (data.monetizable) {
                    revenue += data.generatedEarnings || 0;
                    monetizable++;
                    monetizableClicksCount += data.clicks || 0;
                }
            });
            setTotalClicks(clicks);
            setTotalRevenue(revenue);
            setMonetizableLinks(monetizable);
            setMonetizableClicks(monetizableClicksCount);
            if (loading) setLoading(false);
        });

        const unsubCpm = onSnapshot(cpmQuery, (snapshot) => {
            if (!snapshot.empty) {
                const cpmDoc = snapshot.docs[0];
                setActiveCpm(cpmDoc.data().rate);
            }
        });

        const unsubPayouts = onSnapshot(payoutsQuery, (snapshot) => {
            const payoutsData: PayoutRequest[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data() as PayoutRequest;
                 // Client-side filtering
                if (data.status !== 'pending' && data.processedAt) {
                    payoutsData.push({ id: doc.id, ...data });
                }
            });
            // Slice to get the top 5 after filtering
            setRecentPayouts(payoutsData.slice(0, 5));
        });

        return () => {
            unsubUsers();
            unsubLinks();
            unsubCpm();
            unsubPayouts();
        };
    }, [loading]);

    const stats = [
        { title: 'Total Users', value: userCount, icon: Users, description: 'Live count' },
        { title: 'Total Clicks', value: totalClicks, icon: Eye, description: 'All clicks in the system' },
        { title: 'Monetizable Clicks', value: monetizableClicks, icon: Eye, description: 'Clicks on monetizable links' },
        { title: 'Total Revenue', value: totalRevenue, icon: DollarSign, isCurrency: true, description: `Based on an average CPM` },
    ];

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-xl sm:text-2xl font-bold">Admin Dashboard</h1>
            
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
                    <CardTitle className="text-xl">Recent Payouts</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <Skeleton className="h-40 w-full" />
                    ) : recentPayouts.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentPayouts.map((payout) => (
                                    <TableRow key={payout.id}>
                                        <TableCell className="font-medium">{payout.userName}</TableCell>
                                        <TableCell>${payout.amount.toFixed(4)}</TableCell>
                                        <TableCell>
                                            {payout.processedAt ? new Date(payout.processedAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={payout.status === 'completed' ? 'default' : 'destructive'} className={payout.status === 'completed' ? 'bg-green-600' : ''}>
                                                {payout.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-muted-foreground text-center py-8">No recent processed payouts.</p>
                    )}
                </CardContent>
             </Card>
        </div>
    );
}
