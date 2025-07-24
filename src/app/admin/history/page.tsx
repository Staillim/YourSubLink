
'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, getDoc, doc, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Link2, DollarSign, CheckCircle, UserPlus, ListOrdered } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type Event = {
    id: string;
    type: 'Payout Requested' | 'Payout Processed' | 'User Registered';
    timestamp: any;
    date: string;
    message: string;
    userName: string;
    userId: string;
    icon: React.ElementType;
    badge?: string;
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
}

export default function AdminHistoryPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [_, setForceUpdate] = useState(0);

    useEffect(() => {
      const interval = setInterval(() => {
        setForceUpdate(f => f + 1);
      }, 60000); // Update relative time every minute
      return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setLoading(true);

        const fetchUserName = async (userId: string) => {
            if (!userId) return 'System';
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);
            return userSnap.exists() ? userSnap.data().displayName : 'Unknown User';
        };
        
        const qPayouts = query(collection(db, 'payoutRequests'), orderBy('requestedAt', 'desc'));
        const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'));

        const unsubs: (() => void)[] = [];
        let allEvents: Omit<Event, 'type'> & { type: string }[] = [];

        const processAndSetEvents = () => {
             allEvents.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
             setEvents(allEvents as Event[]);
             setLoading(false);
        };

        unsubs.push(onSnapshot(qPayouts, async (snapshot) => {
            const payoutEvents: Event[] = await Promise.all(snapshot.docs.flatMap(async (payoutDoc) => {
                const data = payoutDoc.data();
                const userName = await fetchUserName(data.userId);
                const eventsArr: Event[] = [];
                
                eventsArr.push({
                    id: payoutDoc.id + '_req',
                    type: 'Payout Requested',
                    timestamp: data.requestedAt,
                    date: new Date(data.requestedAt.seconds * 1000).toLocaleString(),
                    message: `Payout of $${data.amount.toFixed(4)} requested.`,
                    userName: userName,
                    userId: data.userId,
                    icon: DollarSign,
                });
                
                if (data.status !== 'pending' && data.processedAt) {
                     eventsArr.push({
                        id: payoutDoc.id + '_proc',
                        type: 'Payout Processed',
                        timestamp: data.processedAt,
                        date: new Date(data.processedAt.seconds * 1000).toLocaleString(),
                        message: `Payout request of $${data.amount.toFixed(4)} was ${data.status}.`,
                        userName: "Admin",
                        userId: '',
                        icon: CheckCircle,
                        badge: data.status,
                    });
                }
                return eventsArr;
            }));
            allEvents = [...allEvents.filter(e => e.type !== 'Payout Requested' && e.type !== 'Payout Processed'), ...payoutEvents.flat()];
            processAndSetEvents();
        }));

         unsubs.push(onSnapshot(qUsers, async (snapshot) => {
            const userEvents: Event[] = await Promise.all(snapshot.docs.map(async (userDoc) => {
                const data = userDoc.data();
                return {
                    id: userDoc.id,
                    type: 'User Registered',
                    timestamp: data.createdAt,
                    date: new Date(data.createdAt.seconds * 1000).toLocaleString(),
                    message: `User ${data.displayName} (${data.email}) joined.`,
                    userName: data.displayName,
                    userId: data.uid,
                    icon: UserPlus,
                };
            }));
            allEvents = [...allEvents.filter(e => e.type !== 'User Registered'), ...userEvents];
            processAndSetEvents();
        }));


        return () => unsubs.forEach(unsub => unsub());
    }, []);

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold">System History</h1>
            
            <Card>
                <CardHeader>
                    <CardTitle>Activity Feed</CardTitle>
                    <CardDescription>A chronological log of all important system events.</CardDescription>
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
                            <div key={event.id} className="flex items-start gap-4">
                                <div className="bg-muted rounded-full p-2">
                                    <event.icon className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold">{event.userName}</p>
                                        <p className="text-sm text-muted-foreground">{event.message}</p>
                                        {event.badge && (
                                            <Badge variant={event.badge === 'completed' ? 'default' : 'destructive'} className={event.badge === 'completed' ? 'bg-green-600' : ''}>
                                                {event.badge}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {getRelativeTime(new Date(event.timestamp.seconds * 1000))}
                                    </p>
                                </div>
                            </div>
                        ))}
                         {!loading && events.length === 0 && (
                            <div className="text-center text-muted-foreground py-12">
                                <ListOrdered className="mx-auto h-12 w-12 mb-4" />
                                <h3 className="text-lg font-semibold">No events yet</h3>
                                <p className="text-sm">System activity will appear here as it happens.</p>
                            </div>
                         )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
