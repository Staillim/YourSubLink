
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@/hooks/use-user';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, CheckCircle2, XCircle, Clock, Trophy, ShieldAlert, Trash2, MessageSquare, Star } from 'lucide-react';
import type { PayoutRequest } from '@/hooks/use-user';
import type { Notification } from '@/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export type FormattedNotification = {
    id: string;
    icon: React.ElementType;
    color: string;
    title: string;
    description: string;
    date: string;
    timestamp: number;
    href: string;
    isUnread?: boolean;
    type: Notification['type'];
};

export const getNotificationDetails = (notification: Notification): FormattedNotification => {
    const date = notification.createdAt ? new Date(notification.createdAt.seconds * 1000).toLocaleString() : 'N/A';
    const timestamp = notification.createdAt?.seconds || 0;

    switch (notification.type) {
        case 'payout_completed':
            return {
                id: notification.id,
                icon: CheckCircle2,
                color: 'text-green-500',
                title: 'Payout Approved',
                description: notification.message,
                date,
                timestamp,
                href: '/dashboard/payouts',
                isUnread: notification.isRead === false,
                type: notification.type,
            };
        case 'payout_rejected':
            return {
                id: notification.id,
                icon: XCircle,
                color: 'text-red-500',
                title: 'Payout Rejected',
                description: notification.message,
                date,
                timestamp,
                href: '/dashboard/payouts',
                isUnread: notification.isRead === false,
                type: notification.type,
            };
        case 'payout_requested':
             return {
                id: notification.id,
                icon: Clock,
                color: 'text-yellow-500',
                title: 'Payout Pending',
                description: notification.message,
                date,
                timestamp,
                href: '/dashboard/payouts',
                isUnread: notification.isRead === false,
                type: notification.type,
            };
        case 'link_suspension':
            return {
                id: notification.id,
                icon: ShieldAlert,
                color: 'text-yellow-500',
                title: 'Link Monetization Suspended',
                description: notification.message,
                date,
                timestamp,
                href: '/dashboard?tab=suspended',
                isUnread: notification.isRead === false,
                type: notification.type,
            };
        case 'link_deleted':
            return {
                id: notification.id,
                icon: Trash2,
                color: 'text-destructive',
                title: 'Link Deleted',
                description: notification.message,
                date,
                timestamp,
                href: '/dashboard',
                isUnread: notification.isRead === false,
                type: notification.type,
            };
         case 'ticket_answered':
            return {
                id: notification.id,
                icon: MessageSquare,
                color: 'text-blue-500',
                title: 'Support Replied',
                description: notification.message,
                date,
                timestamp,
                href: '/dashboard', // The chat widget will handle it
                isUnread: notification.isRead === false,
                type: notification.type,
            };
        case 'ticket_completed':
            return {
                id: notification.id,
                icon: CheckCircle2,
                color: 'text-green-500',
                title: 'Ticket Closed',
                description: notification.message,
                date,
                timestamp,
                href: '/dashboard', // The chat widget will handle it
                isUnread: notification.isRead === false,
                type: notification.type,
            };
        case 'custom_cpm_set':
            return {
                id: notification.id,
                icon: Star,
                color: 'text-yellow-400',
                title: 'Platform Rate Update',
                description: notification.message,
                date,
                timestamp,
                href: '/dashboard/analytics',
                isUnread: notification.isRead === false,
                type: notification.type,
            };
        case 'milestone':
        default:
            return {
                id: notification.id,
                icon: Trophy,
                color: 'text-blue-500',
                title: 'Milestone Reached!',
                description: notification.message,
                date,
                timestamp,
                href: notification.linkId ? `/dashboard/links/${notification.linkId}` : '/dashboard/analytics',
                isUnread: notification.isRead === false,
                type: 'milestone',
            };
    }
};

const processPayouts = (payouts: PayoutRequest[]): Notification[] => {
    return payouts.map(p => {
        const amount = p.amount.toFixed(2);
        let type: Notification['type'] = 'payout_requested';
        if (p.status === 'completed') type = 'payout_completed';
        if (p.status === 'rejected') type = 'payout_rejected';
        
        return {
            id: p.id,
            userId: p.userId,
            type: type,
            message: `Your request for $${amount} was ${p.status}.`,
            createdAt: p.processedAt || p.requestedAt,
            isRead: p.status !== 'pending' // Consider pending as unread for sorting
        }
    })
}

export default function NotificationsPage() {
    const { user, payouts } = useUser();
    const [notifications, setNotifications] = useState<FormattedNotification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            setLoading(true);
            
            const generalNotificationsQuery = query(
                collection(db, "notifications"), 
                where("userId", "==", user.uid)
            );
            
            const unsubGeneral = onSnapshot(generalNotificationsQuery, (generalSnapshot) => {
                const generalData = generalSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
                const payoutNotifications = processPayouts(payouts);

                const allNotificationsData = [...generalData, ...payoutNotifications];
                
                const sortedNotifications = allNotificationsData.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
                
                const formatted = sortedNotifications.map(getNotificationDetails);
                setNotifications(formatted);
                setLoading(false);
            });

            return () => unsubGeneral();
        } else if (!user) {
            setLoading(false);
        }
    }, [user, payouts]);

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
                         [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)
                    ) : notifications.length > 0 ? (
                        notifications.map((notification) => (
                             <Link key={notification.id} href={notification.href} className="block hover:bg-muted/50 rounded-lg transition-colors">
                                <div className="flex items-start gap-4 p-4 border rounded-lg">
                                    <div className="relative">
                                       <notification.icon className={cn('h-6 w-6 shrink-0', notification.color)} />
                                       {notification.isUnread && (
                                            <span className="absolute top-0 right-0 block h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                            </span>
                                       )}
                                    </div>
                                   <div className="flex-1 space-y-1">
                                        <p className="font-semibold">{notification.title}</p>
                                        <p className="text-sm text-muted-foreground">{notification.description}</p>
                                   </div>
                                   <time className="text-xs text-muted-foreground whitespace-nowrap pt-1">
                                        {notification.date}
                                   </time>
                                </div>
                            </Link>
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
