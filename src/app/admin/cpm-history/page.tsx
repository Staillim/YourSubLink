
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
    // This field was hypothetical. The logic should be based on the click timestamp.
    // Let's adjust the logic to calculate earnings based on when the click happened.
    // However, for simplicity now, let's assume `generatedEarnings` on the link is sufficient.
    // A more complex implementation would log earnings per CPM period on the link itself.
    // The current logic will be an estimation.
}

export default function CpmHistoryPage() {
    const [history, setHistory] = useState<CpmHistory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // We will fetch the CPM history and display it.
        // Calculating exact earnings per period is very complex and would require
        // either processing all `clicks` documents or storing period-specific earnings
        // on each `link`. For now, we will display the CPM history table without
        // the generated revenue, as calculating it accurately on the fly is too intensive.
        const cpmQuery = query(collection(db, 'cpmHistory'), orderBy('startDate', 'desc'));
        
        const unsubscribe = onSnapshot(cpmQuery, (snapshot) => {
            const historyData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as CpmHistory));
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
                    <CardDescription>A log of all CPM rate changes over time.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>CPM Rate</TableHead>
                                <TableHead>Period</TableHead>
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
                                    <TableCell className="text-right font-bold">
                                        {item.endDate ? 'Finished' : 'Active'}
                                    </TableCell>
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
