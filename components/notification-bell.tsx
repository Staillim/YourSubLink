
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@/hooks/use-user';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, getDocs, writeBatch, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell } from 'lucide-react';
import type { Notification } from '@/types';
import { getNotificationDetails, FormattedNotification } from '@/app/dashboard/notifications/page';

export function NotificationBell() {
    const { user } = useUser();
    const [notifications, setNotifications] = useState<FormattedNotification[]>([]);
    const [hasUnread, setHasUnread] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (user) {
            const unreadQuery = query(collection(db, "notifications"), where("userId", "==", user.uid), where("isRead", "==", false));
            const unsubUnread = onSnapshot(unreadQuery, (snapshot) => {
                setHasUnread(!snapshot.empty);
            });
            
            // Simplified query to avoid composite index requirement.
            const allNotifsQuery = query(
                collection(db, "notifications"), 
                where("userId", "==", user.uid)
            );
            
             const unsubAll = onSnapshot(allNotifsQuery, (snapshot) => {
                const notifData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
                
                // Sort and limit on the client side
                const sortedAndLimited = notifData
                    .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
                    .slice(0, 5);

                const formatted = sortedAndLimited.map(getNotificationDetails);
                setNotifications(formatted);
            });

            return () => {
                unsubUnread();
                unsubAll();
            }
        }
    }, [user]);

    const handleMarkAsRead = async () => {
        if (!user || !hasUnread) return;

        const q = query(collection(db, 'notifications'), where('userId', '==', user.uid), where('isRead', '==', false));
        const unreadSnapshot = await getDocs(q);
        
        if (unreadSnapshot.empty) return;

        const batch = writeBatch(db);
        unreadSnapshot.docs.forEach(d => {
            batch.update(d.ref, { isRead: true });
        });
        await batch.commit();
    }
    
    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (open) {
            handleMarkAsRead();
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
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
                <div className="space-y-2 p-4 pt-0 max-h-80 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {notifications.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                             <Bell className="mx-auto h-8 w-8 mb-2" />
                             <p className="text-sm">No notifications yet.</p>
                        </div>
                    ) : (
                        notifications.map(notification => {
                            const { icon: Icon, color, title, description, href, id, type } = notification;
                            return (
                                <Link href={href} key={id} onClick={() => setIsOpen(false)} className="block p-2 rounded-md hover:bg-muted">
                                    <div className="flex items-start gap-3">
                                        <div className="relative">
                                            <Icon className={`h-5 w-5 mt-1 shrink-0 ${color}`} />
                                            {type === 'link_suspension' && (
                                                <span className="absolute top-0 right-0 block h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 text-sm">
                                            <p className="font-medium">{title}</p>
                                            <p className="text-xs text-muted-foreground">{description}</p>
                                        </div>
                                    </div>
                                </Link>
                            )
                        })
                    )}
                </div>
                <div className="p-2 border-t">
                    <Link href="/dashboard/notifications" onClick={() => setIsOpen(false)} className="w-full">
                        <Button variant="link" size="sm" className="w-full">
                           View all notifications
                        </Button>
                    </Link>
                </div>
            </PopoverContent>
        </Popover>
    )
}
