
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Link2, DollarSign, Eye } from 'lucide-react';

type Link = {
    clicks: number;
    monetizable: boolean;
    generatedEarnings: number;
};

export default function AdminDashboardPage() {
    const [userCount, setUserCount] = useState<number | null>(null);
    const [totalClicks, setTotalClicks] = useState<number | null>(null);
    const [totalRevenue, setTotalRevenue] = useState<number | null>(null);
    const [monetizableLinks, setMonetizableLinks] = useState<number | null>(null);
    const [monetizableClicks, setMonetizableClicks] = useState<number | null>(null);
    const [activeCpm, setActiveCpm] = useState<number>(3.00); // Default CPM
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const usersQuery = query(collection(db, 'users'));
        const linksQuery = query(collection(db, 'links'));
        const cpmQuery = query(collection(db, 'cpmHistory'), where('endDate', '==', null));

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
                revenue += data.generatedEarnings || 0;
                if (data.monetizable) {
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

        return () => {
            unsubUsers();
            unsubLinks();
            unsubCpm();
        };
    }, []);

    const stats = [
        { title: 'Total Users', value: userCount, icon: Users, description: 'Live count' },
        { title: 'Total Clicks', value: totalClicks, icon: Eye, description: 'All clicks in the system' },
        { title: 'Monetizable Clicks', value: monetizableClicks, icon: Eye, description: 'Clicks on monetizable links' },
        { title: 'Total Revenue', value: totalRevenue, icon: DollarSign, isCurrency: true, description: `Based on $${activeCpm.toFixed(2)} CPM` },
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
                                {stat.description}
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
                   <p className="text-muted-foreground">Payout history will be displayed here once payments are processed.</p>
                </CardContent>
             </Card>
        </div>
    );
}
