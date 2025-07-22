
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@/hooks/use-user';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { PayoutRequest } from '@/hooks/use-user';


const getNotificationDetails = (payout: PayoutRequest) => {
    const date = payout.requestedAt ? new Date(payout.requestedAt.seconds * 1000).toLocaleDateString() : 'N/A';
     const amount = payout.amount.toFixed(2);

    switch (payout.status) {
        case 'completed':
            return { icon: CheckCircle2, color: 'text-green-500', title: `Approved: $${amount}`, date };
        case 'rejected':
            return { icon: XCircle, color: 'text-red-500', title: `Rejected: $${amount}`, date };
        case 'pending':
        default:
            return { icon: Clock, color: 'text-yellow-500', title: `Pending: $${amount}`, date };
    }
}

export function NotificationBell() {
    const { user } = useUser();
    const [notifications, setNotifications] = useState<PayoutRequest[]>([]);
    const [hasUnread, setHasUnread] = useState(false);

    useEffect(() => {
        if (user) {
            const q = query(collection(db, "payoutRequests"), where("userId", "==", user.uid), orderBy("requestedAt", "desc"));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const payoutData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayoutRequest));
                setNotifications(payoutData);
                
                // Check for pending notifications to show indicator
                if (payoutData.some(p => p.status === 'pending')) {
                    setHasUnread(true);
                } else {
                    setHasUnread(false);
                }
            });
            return () => unsubscribe();
        }
    }, [user]);

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
                    <h4 className="font-medium text-sm">Notifications</h4>
                </div>
                <div className="space-y-2 p-4 pt-0 max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? (
                        notifications.map(payout => {
                             const { icon: Icon, color, title, date } = getNotificationDetails(payout);
                             return (
                                <div key={payout.id} className="flex items-start gap-3">
                                    <Icon className={`h-5 w-5 mt-1 shrink-0 ${color}`} />
                                    <div className="flex-1 text-sm">
                                        <p className="font-medium">{title}</p>
                                        <p className="text-xs text-muted-foreground">{date}</p>
                                    </div>
                                </div>
                             )
                        })
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                             <Bell className="mx-auto h-8 w-8 mb-2" />
                             <p className="text-sm">No notifications yet.</p>
                        </div>
                    )}
                </div>
                <div className="p-2 border-t">
                    <Button variant="link" size="sm" asChild className="w-full">
                        <Link href="/dashboard/notifications">View all notifications</Link>
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}
