
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from '@/hooks/use-toast';
import { Loader2, DollarSign, Calculator, Clock } from 'lucide-react';
import { calculateEarnings } from '@/ai/flows/calculateEarnings';

export default function AdminSettingsPage() {
    const [activeCpm, setActiveCpm] = useState<number | null>(null);
    const [activeCpmId, setActiveCpmId] = useState<string | null>(null);
    const [newCpmRate, setNewCpmRate] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    const [lastCalculation, setLastCalculation] = useState<number | null>(null);

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
    
    const handleCalculateEarnings = async () => {
        const now = Date.now();
        if (lastCalculation && (now - lastCalculation) < 60000) {
            const timeLeft = Math.ceil((60000 - (now - lastCalculation)) / 1000);
            toast({ title: "Please wait", description: `You can run the calculation again in ${timeLeft} seconds.`, variant: "destructive" });
            return;
        }

        setIsCalculating(true);
        try {
            const result = await calculateEarnings();
            toast({
                title: "Calculation Complete",
                description: `Processed ${result.processedClicks} clicks, generating $${result.totalEarnings.toFixed(4)}.`,
            });
            setLastCalculation(now);
        } catch (error) {
            console.error("Error calculating earnings:", error);
            toast({ title: 'Calculation Error', description: 'An error occurred while processing earnings.', variant: 'destructive' });
        } finally {
            setIsCalculating(false);
        }
    }


    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold">System Settings</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <form onSubmit={handleUpdateCpm}>
                        <CardHeader>
                            <CardTitle>Set New CPM Rate</CardTitle>
                            <CardDescription>Setting a new rate will end the current one and start a new period. All users will be notified of the change.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           {loading ? (
                                <Skeleton className="h-12 w-1/2" />
                            ) : activeCpm !== null ? (
                                <div className="flex items-center gap-2">
                                    <DollarSign className="h-8 w-8 text-muted-foreground" />
                                    <div>
                                        <p className="text-4xl font-bold">${activeCpm.toFixed(4)}</p>
                                        <p className="text-xs text-muted-foreground">Current Active Rate</p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-muted-foreground">No active CPM rate set.</p>
                            )}
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
                        </CardContent>
                        <CardFooter>
                             <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Update Rate & Notify Users
                            </Button>
                        </CardFooter>
                     </form>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Process Earnings</CardTitle>
                        <CardDescription>Manually trigger the backend process to calculate and distribute earnings from unprocessed clicks.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-start gap-4 rounded-lg border p-4">
                            <div className="flex items-start gap-4">
                                <Calculator className="h-10 w-10 text-muted-foreground" />
                                <div>
                                    <h3 className="font-semibold">Calculate Pending Earnings</h3>
                                    <p className="text-sm text-muted-foreground">This will process all new clicks and update user balances.</p>
                                </div>
                            </div>
                            <Button onClick={handleCalculateEarnings} disabled={isCalculating}>
                                {isCalculating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Run Calculation
                            </Button>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            This process can be run once per minute.
                        </p>
                    </CardFooter>
                </Card>

            </div>
        </div>
    );
}
