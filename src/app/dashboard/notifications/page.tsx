
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@/hooks/use-user';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { PayoutRequest } from '@/hooks/use-user';

type Notification = {
    id: string;
    icon: React.ElementType;
    color: string;
    title: string;
    description: string;
    date: string;
};

const getNotificationDetails = (payout: PayoutRequest) => {
    const date = payout.requestedAt ? new Date(payout.requestedAt.seconds * 1000).toLocaleString() : 'N/A';
    const amount = payout.amount.toFixed(2);

    switch (payout.status) {
        case 'completed':
            return {
                icon: CheckCircle2,
                color: 'text-green-500',
                title: 'Payout Approved',
                description: `Your request for $${amount} has been approved.`,
                date: payout.processedAt ? new Date(payout.processedAt.seconds * 1000).toLocaleString() : date,
            };
        case 'rejected':
            return {
                icon: XCircle,
                color: 'text-red-500',
                title: 'Payout Rejected',
                description: `Your request for $${amount} has been rejected.`,
                date: payout.processedAt ? new Date(payout.processedAt.seconds * 1000).toLocaleString() : date,
            };
        case 'pending':
        default:
            return {
                icon: Clock,
                color: 'text-yellow-500',
                title: 'Payout Pending',
                description: `Your request for $${amount} is currently under review.`,
                date,
            };
    }
}


export default function NotificationsPage() {
    const { user } = useUser();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            setLoading(true);
            const q = query(collection(db, "payoutRequests"), where("userId", "==", user.uid));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const payoutData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayoutRequest));
                
                // Sort client-side
                payoutData.sort((a, b) => (b.requestedAt?.seconds ?? 0) - (a.requestedAt?.seconds ?? 0));

                const notificationData = payoutData.map(p => {
                    const details = getNotificationDetails(p);
                    return {
                        id: p.id,
                        ...details,
                    }
                });
                
                // Here you would merge with other notification types
                setNotifications(notificationData);
                setLoading(false);
            });
            return () => unsubscribe();
        }
    }, [user]);

  return (
    <div className="flex flex-col gap-6">
        <div className="flex items-center">
            <h1 className="text-lg font-semibold md:text-2xl">Notifications</h1>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>All Notifications</CardTitle>
                <CardDescription>Here is a complete list of your account alerts.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {loading ? (
                        <p>Loading notifications...</p>
                    ) : notifications.length > 0 ? (
                        notifications.map((notification) => (
                            <div key={notification.id} className="flex items-start gap-4 p-4 border rounded-lg">
                               <notification.icon className={`h-6 w-6 shrink-0 ${notification.color}`} />
                               <div className="flex-1 space-y-1">
                                    <p className="font-semibold">{notification.title}</p>
                                    <p className="text-sm text-muted-foreground">{notification.description}</p>
                               </div>
                               <time className="text-xs text-muted-foreground whitespace-nowrap">
                                    {notification.date}
                               </time>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-muted-foreground py-12">
                            <Bell className="mx-auto h-12 w-12 mb-4" />
                            <h3 className="text-lg font-semibold">No new notifications</h3>
                            <p className="text-sm">You're all caught up!</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
