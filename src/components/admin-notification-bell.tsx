
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@/hooks/use-user';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, CreditCard, ShieldAlert } from 'lucide-react';
import type { PayoutRequest } from '@/hooks/use-user';
import { Skeleton } from './ui/skeleton';

export function AdminNotificationBell() {
    const { user, role } = useUser();
    const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user && role === 'admin') {
            const q = query(collection(db, "payoutRequests"), where("status", "==", "pending"));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const payoutData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayoutRequest));
                setPayouts(payoutData);
                setLoading(false);
            }, (error) => {
                console.error("Error fetching payout requests: ", error);
                setLoading(false);
            });
            return () => unsubscribe();
        } else {
            setLoading(false);
        }
    }, [user, role]);

    const hasUnread = payouts.length > 0;

    if (loading) {
        return <Skeleton className="h-9 w-9 rounded-full" />;
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {hasUnread && (
                        <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0">
                <div className="p-4">
                    <h4 className="font-medium text-sm">Admin Notifications</h4>
                </div>
                <div className="space-y-2 p-4 pt-0 max-h-80 overflow-y-auto">
                    {payouts.length > 0 ? (
                        payouts.map(payout => (
                             <div key={payout.id} className="flex items-start gap-3">
                                <CreditCard className="h-5 w-5 mt-1 shrink-0 text-yellow-500" />
                                <div className="flex-1 text-sm">
                                    <p className="font-medium">New Payout Request</p>
                                    <p className="text-xs text-muted-foreground">
                                        {payout.userName} requested ${payout.amount.toFixed(2)}.
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                             <Bell className="mx-auto h-8 w-8 mb-2" />
                             <p className="text-sm">No new notifications.</p>
                        </div>
                    )}
                    {/* Placeholder for suspicious activity */}
                    <div className="flex items-start gap-3 opacity-50">
                        <ShieldAlert className="h-5 w-5 mt-1 shrink-0 text-orange-500" />
                        <div className="flex-1 text-sm">
                            <p className="font-medium">Suspicious Link</p>
                            <p className="text-xs text-muted-foreground">
                                No suspicious activity detected.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="p-2 border-t">
                    <Button variant="link" size="sm" asChild className="w-full">
                        <Link href="/admin/payout-requests">View all payouts</Link>
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}
