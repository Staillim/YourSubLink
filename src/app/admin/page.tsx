
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Link2, DollarSign, Eye, ArrowRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const CPM = 3.00; // Cost Per Mille (1000 views)

type Link = {
    clicks: number;
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
    const [userCount, setUserCount] = useState<number | null>(null);
    const [totalClicks, setTotalClicks] = useState<number | null>(null);
    const [totalRevenue, setTotalRevenue] = useState<number | null>(null);
    const [monetizableLinks, setMonetizableLinks] = useState<number | null>(null);
    const [recentPayouts, setRecentPayouts] = useState<PayoutRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [payoutsLoading, setPayoutsLoading] = useState(true);

    useEffect(() => {
        const usersQuery = query(collection(db, 'users'));
        const linksQuery = query(collection(db, 'links'));

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
        
        const payoutsQuery = query(collection(db, 'payoutRequests'), orderBy('requestedAt', 'desc'), limit(5));
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
                                    {[...Array(3)].map((_, i) => (
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
                               {recentPayouts.map((req) => (
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
    );
}
