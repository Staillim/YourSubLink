
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@/hooks/use-user';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, writeBatch, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, CreditCard, MessageSquare } from 'lucide-react';
import type { PayoutRequest } from '@/hooks/use-user';
import { Skeleton } from './ui/skeleton';
import type { SupportTicket } from '@/types';

export function AdminNotificationBell() {
    const { user, role, loading: userLoading } = useUser();
    const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
    const [unreadChats, setUnreadChats] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userLoading) {
            setLoading(true);
            return;
        }
        if (role !== 'admin') {
            setLoading(false);
            return;
        }

        let payoutsLoaded = false;
        let chatsLoaded = false;

        const checkAllLoaded = () => {
            if (payoutsLoaded && chatsLoaded) {
                setLoading(false);
            }
        };

        const payoutQuery = query(collection(db, "payoutRequests"), where("status", "==", "pending"));
        const unsubPayouts = onSnapshot(payoutQuery, (snapshot) => {
            const payoutData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayoutRequest));
            setPayouts(payoutData);
            payoutsLoaded = true;
            checkAllLoaded();
        }, (error) => {
            console.error("Error fetching payout requests: ", error);
            payoutsLoaded = true;
            checkAllLoaded();
        });

        const chatsQuery = query(collection(db, 'supportTickets'), where('isReadByAdmin', '==', false));
        const unsubChats = onSnapshot(chatsQuery, (snapshot) => {
            const chatData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket));
            setUnreadChats(chatData);
            chatsLoaded = true;
            checkAllLoaded();
        }, (error) => {
            console.error("Error fetching unread chats: ", error);
            chatsLoaded = true;
            checkAllLoaded();
        });

        return () => {
            unsubPayouts();
            unsubChats();
        };
    }, [user, role, userLoading]);
    
    // This function is now more robust. It iterates over the state directly.
    const handleMarkAsRead = async () => {
        if (unreadChats.length === 0) return;

        const batch = writeBatch(db);
        unreadChats.forEach(chat => {
            const ticketRef = doc(db, 'supportTickets', chat.id);
            batch.update(ticketRef, { isReadByAdmin: true });
        });
        
        try {
            await batch.commit();
            // No need to manually update state, onSnapshot will do it.
        } catch (error) {
            console.error("Error marking chats as read: ", error);
        }
    };
    
    const handleOpenChange = (open: boolean) => {
        // We only care about when the popover is opened.
        if (open && unreadChats.length > 0) {
            handleMarkAsRead();
        }
    };

    const hasUnread = payouts.length > 0 || unreadChats.length > 0;

    if (loading) {
        return <Skeleton className="h-9 w-9 rounded-full" />;
    }

    return (
        <Popover onOpenChange={handleOpenChange}>
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
                <div className="space-y-1 p-4 pt-0 max-h-80 overflow-y-auto">
                    {!hasUnread ? (
                         <div className="text-center text-muted-foreground py-8">
                             <Bell className="mx-auto h-8 w-8 mb-2" />
                             <p className="text-sm">No new notifications.</p>
                        </div>
                    ) : (
                        <>
                            {unreadChats.map(chat => (
                                <Link href="/admin/support" key={chat.id} className="block p-2 rounded-md hover:bg-muted">
                                    <div className="flex items-start gap-3">
                                        <MessageSquare className="h-5 w-5 mt-1 shrink-0 text-blue-500" />
                                        <div className="flex-1 text-sm">
                                            <p className="font-medium">New Support Message</p>
                                            <p className="text-xs text-muted-foreground">
                                                New message from {chat.userName}.
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                            {payouts.map(payout => (
                                <Link href="/admin/payout-requests" key={payout.id} className="block p-2 rounded-md hover:bg-muted">
                                    <div className="flex items-start gap-3">
                                        <CreditCard className="h-5 w-5 mt-1 shrink-0 text-yellow-500" />
                                        <div className="flex-1 text-sm">
                                            <p className="font-medium">New Payout Request</p>
                                            <p className="text-xs text-muted-foreground">
                                                {payout.userName} requested ${payout.amount.toFixed(4)}.
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </>
                    )}
                </div>
                <div className="p-2 border-t">
                    <Button variant="link" size="sm" asChild className="w-full">
                        <Link href="/admin/history">View all system history</Link>
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}
