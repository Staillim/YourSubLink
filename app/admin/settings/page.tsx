
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from '@/hooks/use-toast';
import { Loader2, DollarSign } from 'lucide-react';
import { SponsorStatsMigrator } from '@/components/sponsor-stats-migrator';

export default function AdminSettingsPage() {
    const [activeCpm, setActiveCpm] = useState<number | null>(null);
    const [activeCpmId, setActiveCpmId] = useState<string | null>(null);
    const [newCpmRate, setNewCpmRate] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchActiveCpm = async () => {
        setLoading(true);
        const q = query(collection(db, 'cpmHistory'), where('endDate', '==', null));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const cpmDoc = querySnapshot.docs[0];
            setActiveCpm(cpmDoc.data().rate);
            setActiveCpmId(cpmDoc.id);
        } else {
            setActiveCpm(null);
        }
        setLoading(false);
    }

    useEffect(() => {
        fetchActiveCpm();
    }, []);

    const handleUpdateCpm = async (e: React.FormEvent) => {
        e.preventDefault();
        const rate = parseFloat(newCpmRate);
        if (isNaN(rate) || rate < 0) {
            toast({ title: 'Invalid Rate', description: 'Please enter a valid positive number (0 is allowed).', variant: 'destructive'});
            return;
        }

        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);

            // End the current active CPM if it exists
            if (activeCpmId) {
                const oldCpmRef = doc(db, 'cpmHistory', activeCpmId);
                batch.update(oldCpmRef, { endDate: serverTimestamp() });
            }

            // Create a new CPM entry
            const newCpmRef = doc(collection(db, 'cpmHistory'));
            batch.set(newCpmRef, {
                rate: rate,
                startDate: serverTimestamp(),
                endDate: null
            });
            
            // --- NOTIFICATION LOGIC ---
            // 1. Fetch all users
            const usersQuery = query(collection(db, 'users'));
            const usersSnapshot = await getDocs(usersQuery);

            // 2. Create a notification for each user
            const notificationMessage = rate > 0
                ? `The global CPM rate has been updated to $${rate.toFixed(4)}. Your earnings will now reflect this new rate.`
                : 'The global CPM rate has been set to $0.00. Monetization is temporarily paused due to technical reasons or lack of ad inventory.';

            usersSnapshot.forEach(userDoc => {
                const notificationRef = doc(collection(db, 'notifications'));
                batch.set(notificationRef, {
                    userId: userDoc.id,
                    type: 'custom_cpm_set', // Re-using this type for a global announcement
                    message: notificationMessage,
                    createdAt: serverTimestamp(),
                    isRead: false,
                });
            });


            await batch.commit();

            toast({ title: 'CPM Rate Updated', description: `The new CPM rate of $${rate.toFixed(4)} is now active. All users have been notified.` });
            setNewCpmRate('');
            await fetchActiveCpm(); // Refresh active CPM data

        } catch (error: any) {
            console.error("Error updating CPM rate: ", error);
            toast({ title: 'Error', description: 'Could not update CPM rate.', variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
    }


    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold">System Settings</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Active CPM Rate</CardTitle>
                        <CardDescription>This is the current Cost Per Mille (1000 views) rate used for earnings calculation.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Skeleton className="h-12 w-1/2" />
                        ) : activeCpm !== null ? (
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-8 w-8 text-muted-foreground" />
                                <p className="text-4xl font-bold">${activeCpm.toFixed(4)}</p>
                            </div>
                        ) : (
                            <p className="text-muted-foreground">No active CPM rate set.</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                     <form onSubmit={handleUpdateCpm}>
                        <CardHeader>
                            <CardTitle>Set New CPM Rate</CardTitle>
                            <CardDescription>Setting a new rate will end the current one and start a new period. All users will be notified of the change.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="new-cpm">New CPM Rate ($)</Label>
                                <Input
                                    id="new-cpm"
                                    type="number"
                                    step="0.0001"
                                    placeholder="e.g. 3.50 or 0"
                                    value={newCpmRate}
                                    onChange={(e) => setNewCpmRate(e.target.value)}
                                    required
                                />
                            </div>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Update Rate & Notify Users
                            </Button>
                        </CardContent>
                     </form>
                </Card>

                <SponsorStatsMigrator />

            </div>
        </div>
    );
}
