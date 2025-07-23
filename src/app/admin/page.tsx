
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Link2, DollarSign, Eye } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type Link = {
    clicks: number;
    realClicks?: number;
    monetizable: boolean;
};

type Payout = {
    id: string;
    userName: string;
    amount: number;
    status: 'completed' | 'rejected' | 'pending';
    processedAt?: any;
    requestedAt: any;
}

export default function AdminDashboardPage() {
    const [userCount, setUserCount] = useState<number | null>(null);
    const [totalClicks, setTotalClicks] = useState<number | null>(null);
    const [totalRevenue, setTotalRevenue] = useState<number | null>(null);
    const [monetizableLinks, setMonetizableLinks] = useState<number | null>(null);
    const [recentPayouts, setRecentPayouts] = useState<Payout[]>([]);
    const [cpm, setCpm] = useState(3.00); // Default CPM
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
             const settingsRef = doc(db, 'settings', 'global');
             const docSnap = await getDoc(settingsRef);
             if (docSnap.exists()) {
                 setCpm(docSnap.data().cpm || 3.00);
             }
        }
        fetchSettings();

        const usersQuery = query(collection(db, 'users'));
        const linksQuery = query(collection(db, 'links'));
        const payoutsQuery = query(collection(db, 'payoutRequests'), orderBy('processedAt', 'desc'), limit(5));


        const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
            setUserCount(snapshot.size);
            if (loading) setLoading(false);
        });

        const unsubLinks = onSnapshot(linksQuery, (snapshot) => {
            let allClicks = 0;
            let monetizedRealClicks = 0;
            let monetizableCount = 0;
            snapshot.forEach((doc) => {
                const data = doc.data() as Link;
                allClicks += data.clicks || 0;
                if (data.monetizable) {
                    monetizableCount++;
                    // Use realClicks if available for revenue calculation
                    monetizedRealClicks += data.realClicks || 0;
                }
            });
            setTotalClicks(allClicks);
            setTotalRevenue((monetizedRealClicks / 1000) * cpm);
            setMonetizableLinks(monetizableCount);
            if (loading) setLoading(false);
        });
        
        const unsubPayouts = onSnapshot(payoutsQuery, (snapshot) => {
            const payoutsData: Payout[] = [];
            snapshot.forEach((doc) => {
                // We only want to show processed payouts in this recent list
                if (doc.data().status !== 'pending') {
                    payoutsData.push({ id: doc.id, ...doc.data() } as Payout)
                }
            });
            setRecentPayouts(payoutsData);
        });


        return () => {
            unsubUsers();
            unsubLinks();
            unsubPayouts();
        };
    }, [cpm, loading]);

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
                                {index === 2 ? `Based on $${cpm.toFixed(2)} CPM & real clicks` : 'Live count'}
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
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4}>
                                        <Skeleton className="h-5 w-full" />
                                    </TableCell>
                                </TableRow>
                            ) : recentPayouts.length > 0 ? (
                                recentPayouts.map((payout) => (
                                    <TableRow key={payout.id}>
                                        <TableCell>{payout.userName}</TableCell>
                                        <TableCell>${payout.amount.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Badge variant={payout.status === 'completed' ? 'default' : 'destructive'} className={payout.status === 'completed' ? 'bg-green-600' : ''}>
                                                {payout.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{payout.processedAt ? new Date(payout.processedAt.seconds * 1000).toLocaleDateString() : 'N/A'}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                 <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No recent payouts processed.
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
