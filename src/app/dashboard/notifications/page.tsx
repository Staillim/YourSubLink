
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, CheckCircle2, XCircle, Award } from 'lucide-react';

const notifications = [
    {
        icon: CheckCircle2,
        color: 'text-green-500',
        title: 'Payout Request Approved',
        description: 'Your request to withdraw $52.50 has been approved and is being processed.',
        date: '2 hours ago'
    },
    {
        icon: XCircle,
        color: 'text-red-500',
        title: 'Link Suspended',
        description: 'Your link "Free V-Bucks Giveaway" has been suspended due to suspicious activity.',
        date: '1 day ago'
    },
    {
        icon: Award,
        color: 'text-yellow-500',
        title: 'Milestone Achieved!',
        description: 'Congratulations! You\'ve reached over 10,000 clicks on your links.',
        date: '3 days ago'
    }
]


export default function NotificationsPage() {
  return (
    <div className="flex flex-col gap-6">
        <div className="flex items-center">
            <h1 className="text-lg font-semibold md:text-2xl">Notifications</h1>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>Recent Alerts</CardTitle>
                <CardDescription>Here is a list of your recent notifications.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {notifications.map((notification, index) => (
                        <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                           <notification.icon className={`h-6 w-6 shrink-0 ${notification.color}`} />
                           <div className="flex-1 space-y-1">
                                <p className="font-semibold">{notification.title}</p>
                                <p className="text-sm text-muted-foreground">{notification.description}</p>
                           </div>
                           <time className="text-xs text-muted-foreground whitespace-nowrap">
                                {notification.date}
                           </time>
                        </div>
                    ))}
                    {notifications.length === 0 && (
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
