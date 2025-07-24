'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, getDocs, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, History, Loader2 } from 'lucide-react';

type CpmHistory = {
    id: string;
    rate: number;
    startDate: any;
    endDate?: any;
    earnings?: number;
};

export default function CpmHistoryPage() {
    const [history, setHistory] = useState<CpmHistory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const cpmQuery = query(collection(db, 'cpmHistory'), orderBy('startDate', 'desc'));
        
        const unsubscribe = onSnapshot(cpmQuery, async (snapshot) => {
            setLoading(true);
            const historyData: CpmHistory[] = [];
            for (const doc of snapshot.docs) {
                const data = doc.data() as CpmHistory;
                data.id = doc.id;
                
                // Calculate earnings for this period
                const clicksQuery = query(collection(db, 'clicks'), where('cpmHistoryId', '==', doc.id));
                const clicksSnapshot = await getDocs(clicksQuery);
                const periodEarnings = clicksSnapshot.docs.reduce((acc, clickDoc) => acc + (clickDoc.data().earnings || 0), 0);
                data.earnings = periodEarnings;

                historyData.push(data);
            }
            setHistory(historyData);
            setLoading(false);
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
            <h1 className="text-2xl font-bold">CPM History</h1>
            
            <Card>
                <CardHeader>
                    <CardTitle>CPM Rate History</CardTitle>
                    <CardDescription>A log of all CPM rate changes over time and the revenue generated during each period.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>CPM Rate</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead className="text-right">Generated Revenue</TableHead>
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
                                    <TableCell className="text-right font-semibold">
                                        {item.earnings !== undefined ? `$${item.earnings.toFixed(4)}` : <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
                                    </TableCell>
                                    <TableCell className="text-right font-bold">
                                        {item.endDate ? 'Finished' : 'Active'}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!loading && history.length === 0 && (
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
