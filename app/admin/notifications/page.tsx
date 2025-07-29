
'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, getDocs, limit, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, ListOrdered, CheckCircle, UserPlus, DollarSign, MessageSquare, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

type FormattedEvent = {
    id: string;
    type: string;
    Icon: React.ElementType;
    iconColor: string;
    title: string;
    description: string;
    timestamp: any;
    href: string;
};

const getRelativeTime = (date: Date) => {
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
};

export default function AdminNotificationsPage() {
    const [events, setEvents] = useState<FormattedEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [_, setForceUpdate] = useState(0);

    useEffect(() => {
      const interval = setInterval(() => {
        setForceUpdate(f => f + 1);
      }, 60000);
      return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchAllNotifications = async () => {
            setLoading(true);

            // Fetch recent user registrations
            const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(15));
            const usersSnap = await getDocs(usersQuery);
            const userEvents = usersSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    type: 'User Registered',
                    Icon: UserPlus,
                    iconColor: 'text-blue-500',
                    title: `New User: ${data.displayName}`,
                    description: `${data.email} joined the platform.`,
                    timestamp: data.createdAt,
                    href: `/admin/users`
                }
            });

            // Fetch recent payout requests
            const payoutsQuery = query(collection(db, 'payoutRequests'), orderBy('requestedAt', 'desc'), limit(15));
            const payoutsSnap = await getDocs(payoutsQuery);
            const payoutEvents = payoutsSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    type: 'Payout Request',
                    Icon: DollarSign,
                    iconColor: 'text-yellow-500',
                    title: `Payout Request from ${data.userName}`,
                    description: `Requested $${data.amount.toFixed(2)} via ${data.method}.`,
                    timestamp: data.requestedAt,
                    href: '/admin/payout-requests'
                }
            });

            // Fetch recent support tickets
            const ticketsQuery = query(collection(db, 'supportTickets'), orderBy('lastMessageTimestamp', 'desc'), limit(15));
            const ticketsSnap = await getDocs(ticketsQuery);
            const ticketEvents = ticketsSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    type: 'Support Ticket',
                    Icon: data.isReadByAdmin ? MessageSquare : ShieldAlert,
                    iconColor: data.isReadByAdmin ? 'text-gray-500' : 'text-blue-500',
                    title: `${data.isReadByAdmin ? 'Chat Update' : 'New Message'} from ${data.userName}`,
                    description: data.subject,
                    timestamp: data.lastMessageTimestamp,
                    href: '/admin/support'
                }
            });
            
            const all = [...userEvents, ...payoutEvents, ...ticketEvents]
                .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds)
                .slice(0, 50); // Final limit after merging
                
            setEvents(all as FormattedEvent[]);
            setLoading(false);
        };

        fetchAllNotifications();

    }, []);

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold">All Notifications</h1>
            
            <Card>
                <CardHeader>
                    <CardTitle>System-Wide Feed</CardTitle>
                    <CardDescription>A combined feed of recent, important events across the platform.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {loading && (
                            [...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/4" />
                                    </div>
                                </div>
                            ))
                        )}
                        {!loading && events.map((event) => (
                           <Link key={event.id} href={event.href} className="block rounded-lg -m-3 p-3 hover:bg-muted/50 transition-colors">
                             <div className="flex items-start gap-4">
                                <div className="bg-muted rounded-full p-2">
                                    <event.Icon className={`h-6 w-6 ${event.iconColor}`} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold">{event.title}</p>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{event.description}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {getRelativeTime(new Date(event.timestamp.seconds * 1000))}
                                    </p>
                                </div>
                             </div>
                           </Link>
                        ))}
                         {!loading && events.length === 0 && (
                            <div className="text-center text-muted-foreground py-12">
                                <Bell className="mx-auto h-12 w-12 mb-4" />
                                <h3 className="text-lg font-semibold">No notifications yet</h3>
                                <p className="text-sm">System activity will appear here as it happens.</p>
                            </div>
                         )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
