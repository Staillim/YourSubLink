
'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, History } from 'lucide-react';

type CpmHistory = {
    id: string;
    rate: number;
    startDate: any;
    endDate?: any;
    earnings?: number;
};

type LinkEarnings = {
    id: string;
    earningsByCpm?: { [key: string]: number };
}

export default function CpmHistoryPage() {
    const [history, setHistory] = useState<CpmHistory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            // Fetch CPM History first
            const historyQuery = query(collection(db, 'cpmHistory'), orderBy('startDate', 'desc'));
            const historySnapshot = await getDocs(historyQuery);
            const historyData: CpmHistory[] = historySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CpmHistory));

            if (historyData.length > 0) {
                // Then fetch all links
                const linksSnapshot = await getDocs(collection(db, 'links'));
                const links: LinkEarnings[] = linksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LinkEarnings));

                // Calculate earnings for each history entry
                const historyWithEarnings = historyData.map(cpmEntry => {
                    const totalEarnings = links.reduce((acc, link) => {
                        if (link.earningsByCpm && link.earningsByCpm[cpmEntry.id]) {
                            return acc + link.earningsByCpm[cpmEntry.id];
                        }
                        return acc;
                    }, 0);
                    return { ...cpmEntry, earnings: totalEarnings };
                });
                setHistory(historyWithEarnings);
            } else {
                 setHistory([]);
            }

            setLoading(false);
        };

        fetchData();
        
        // We can also add a snapshot listener to refetch data if something changes
        const unsubscribe = onSnapshot(query(collection(db, 'cpmHistory')), (snapshot) => {
             fetchData();
        });
        
        return () => unsubscribe();

    }, []);

    if (loading) {
        return (
             <div className="flex flex-col gap-6">
                <h1 className="text-2xl font-bold">CPM History</h1>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {[...Array(3)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {[...Array(3)].map((_, i) => (
                                    <TableRow key={i}>
                                        {[...Array(3)].map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold">CPM History</h1>
            
            <Card>
                <CardHeader>
                    <CardTitle>CPM Rate History</CardTitle>
                    <CardDescription>A log of all CPM rate changes and the revenue generated during each period.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>CPM Rate</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead className="text-right">Generated Revenue</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-semibold">${item.rate.toFixed(2)}</TableCell>
                                    <TableCell>
                                        {new Date(item.startDate.seconds * 1000).toLocaleDateString()} - {item.endDate ? new Date(item.endDate.seconds * 1000).toLocaleDateString() : 'Present'}
                                    </TableCell>
                                    <TableCell className="text-right font-bold">${(item.earnings || 0).toFixed(4)}</TableCell>
                                </TableRow>
                            ))}
                            {history.length === 0 && (
                                 <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        No CPM history found. The first rate has not been set yet.
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

    