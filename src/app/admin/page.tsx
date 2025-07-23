
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Link2, DollarSign, Eye } from 'lucide-react';

type Link = {
    clicks: number;
    realClicks?: number; // Real clicks might not exist on old documents
    monetizable: boolean;
};

export default function AdminDashboardPage() {
    const [userCount, setUserCount] = useState<number | null>(null);
    const [totalClicks, setTotalClicks] = useState<number | null>(null);
    const [totalRevenue, setTotalRevenue] = useState<number | null>(null);
    const [monetizableLinks, setMonetizableLinks] = useState<number | null>(null);
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
                    // Use realClicks if available, otherwise fallback to total clicks for revenue calc
                    monetizedRealClicks += data.realClicks || 0;
                }
            });
            setTotalClicks(allClicks);
            setTotalRevenue((monetizedRealClicks / 1000) * cpm);
            setMonetizableLinks(monetizableCount);
            if (loading) setLoading(false);
        });

        return () => {
            unsubUsers();
            unsubLinks();
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
                   <p className="text-muted-foreground">Payout history will be displayed here once payments are processed.</p>
                </CardContent>
             </Card>
        </div>
    );
}
