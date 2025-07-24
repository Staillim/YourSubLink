
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@/hooks/use-user';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, getDocs, writeBatch, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, CheckCircle2, XCircle, Clock, Trophy } from 'lucide-react';
import type { PayoutRequest } from '@/hooks/use-user';
import type { Notification } from '@/types';

const getPayoutNotificationDetails = (payout: PayoutRequest) => {
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
    const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
    const [milestones, setMilestones] = useState<Notification[]>([]);
    const [hasUnread, setHasUnread] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (user) {
            // Check for unread general notifications
            const generalQuery = query(collection(db, "notifications"), where("userId", "==", user.uid), where("isRead", "==", false));
            const unsubGeneral = onSnapshot(generalQuery, (snapshot) => {
                setHasUnread(!snapshot.empty);
            });
            
            // Fetch all notifications for display
            const allPayoutsQuery = query(collection(db, "payoutRequests"), where("userId", "==", user.uid));
            const unsubPayouts = onSnapshot(allPayoutsQuery, (snapshot) => {
                const payoutData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayoutRequest));
                payoutData.sort((a, b) => (b.requestedAt?.seconds ?? 0) - (a.requestedAt?.seconds ?? 0));
                setPayouts(payoutData);
            });

            const milestoneQuery = query(collection(db, "notifications"), where("userId", "==", user.uid));
             const unsubMilestones = onSnapshot(milestoneQuery, (snapshot) => {
                const milestoneData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
                milestoneData.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
                setMilestones(milestoneData);
            });

            return () => {
                unsubGeneral();
                unsubPayouts();
                unsubMilestones();
            }
        }
    }, [user]);

    const handleMarkAsRead = async () => {
        if (!user) return;
        const q = query(collection(db, 'notifications'), where('userId', '==', user.uid), where('isRead', '==', false));
        const unreadSnapshot = await getDocs(q);
        
        if (unreadSnapshot.empty) return;

        const batch = writeBatch(db);
        unreadSnapshot.docs.forEach(d => {
            batch.update(d.ref, { isRead: true });
        });
        await batch.commit();
        setIsOpen(false); // Close popover after click
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
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
                    {payouts.length === 0 && milestones.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                             <Bell className="mx-auto h-8 w-8 mb-2" />
                             <p className="text-sm">No notifications yet.</p>
                        </div>
                    ) : (
                        <>
                            {milestones.map(milestone => (
                                <div key={milestone.id} className="flex items-start gap-3">
                                    <Trophy className="h-5 w-5 mt-1 shrink-0 text-blue-500" />
                                    <div className="flex-1 text-sm">
                                        <p className="font-medium">Milestone Reached!</p>
                                        <p className="text-xs text-muted-foreground">{milestone.message}</p>
                                    </div>
                                </div>
                            ))}
                            {payouts.map(payout => {
                                const { icon: Icon, color, title, date } = getPayoutNotificationDetails(payout);
                                return (
                                    <div key={payout.id} className="flex items-start gap-3">
                                        <Icon className={`h-5 w-5 mt-1 shrink-0 ${color}`} />
                                        <div className="flex-1 text-sm">
                                            <p className="font-medium">{title}</p>
                                            <p className="text-xs text-muted-foreground">{date}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </>
                    )}
                </div>
                <div className="p-2 border-t">
                    <Link href="/dashboard/notifications" onClick={handleMarkAsRead} className="w-full">
                        <Button variant="link" size="sm" className="w-full">
                           View all notifications
                        </Button>
                    </Link>
                </div>
            </PopoverContent>
        </Popover>
    )
}
