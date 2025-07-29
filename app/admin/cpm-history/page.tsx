
'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type CpmHistory = {
    id: string;
    rate: number;
    startDate: any;
    endDate?: any;
    earnings: number;
};

type Link = {
    id: string;
    createdAt: any;
    generatedEarnings: number;
}

export default function CpmHistoryPage() {
    const [history, setHistory] = useState<CpmHistory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const cpmQuery = query(collection(db, 'cpmHistory'), orderBy('startDate', 'desc'));
        
        const unsubscribe = onSnapshot(cpmQuery, async (snapshot) => {
            const historyData: Omit<CpmHistory, 'earnings'>[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Omit<CpmHistory, 'earnings'>));

            // Fetch all links once to calculate earnings
            const linksQuery = collection(db, 'links');
            const linksSnapshot = await getDocs(linksQuery);
            const allLinks = linksSnapshot.docs.map(doc => doc.data() as Link);

            const historyWithEarnings = historyData.map(cpmPeriod => {
                let periodEarnings = 0;
                const periodStart = cpmPeriod.startDate.toMillis();
                // If endDate is null, it's the current period, so we use now as the end.
                const periodEnd = cpmPeriod.endDate ? cpmPeriod.endDate.toMillis() : Date.now();

                for (const link of allLinks) {
                    // A simple estimation: if a link was created during this period,
                    // attribute all its earnings to this period.
                    // A more accurate (but much more complex) calculation would require
                    // associating every single click with the CPM rate at the time of the click.
                    if (link.createdAt) {
                        const linkCreation = link.createdAt.toMillis();
                        if(linkCreation >= periodStart && linkCreation <= periodEnd) {
                            periodEarnings += link.generatedEarnings || 0;
                        }
                    }
                }

                return {
                    ...cpmPeriod,
                    earnings: periodEarnings,
                };
            });


            setHistory(historyWithEarnings);
            setLoading(false);
        });

        return () => unsubscribe();

    }, []);

    if (loading) {
        return (
             <div className="flex flex-col gap-6">
                <h1 className="text-xl font-bold md:text-2xl">CPM History</h1>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {[...Array(4)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}
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
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-xl font-bold md:text-2xl">CPM History</h1>
            
            <Card>
                <CardHeader>
                    <CardTitle>CPM Rate History</CardTitle>
                    <CardDescription>A log of all CPM rate changes and the estimated revenue generated during that period.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>CPM Rate</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>Generated Revenue</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-semibold">${item.rate.toFixed(4)}</TableCell>
                                    <TableCell>
                                        {item.startDate ? new Date(item.startDate.seconds * 1000).toLocaleString() : 'N/A'} - {item.endDate ? new Date(item.endDate.seconds * 1000).toLocaleString() : 'Present'}
                                    </TableCell>
                                    <TableCell className="font-bold text-green-500">${item.earnings.toFixed(4)}</TableCell>
                                    <TableCell className="text-right font-bold">
                                        {item.endDate ? 'Finished' : 'Active'}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {history.length === 0 && (
                                 <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
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
