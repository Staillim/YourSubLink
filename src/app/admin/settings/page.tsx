
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type Settings = {
    minPayout: number;
    rulesToMonetize: number;
};

export default function AdminSettingsPage() {
    const [activeCpm, setActiveCpm] = useState<number | null>(null);
    const [newCpm, setNewCpm] = useState('');
    
    const [settings, setSettings] = useState<Settings | null>(null);
    const [minPayout, setMinPayout] = useState('');
    const [rulesToMonetize, setRulesToMonetize] = useState('');

    const [loadingCpm, setLoadingCpm] = useState(true);
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [isSubmittingCpm, setIsSubmittingCpm] = useState(false);
    const [isSubmittingSettings, setIsSubmittingSettings] = useState(false);
    
    const { toast } = useToast();

    // Fetch active CPM
    useEffect(() => {
        const cpmQuery = query(collection(db, 'cpmHistory'), where('endDate', '==', null));
        const unsubscribe = onSnapshot(cpmQuery, (snapshot) => {
            if (!snapshot.empty) {
                const cpmDoc = snapshot.docs[0];
                setActiveCpm(cpmDoc.data().rate);
            } else {
                setActiveCpm(null); // No active rate set yet
            }
            setLoadingCpm(false);
        });
        return () => unsubscribe();
    }, []);

    // Fetch global settings
    useEffect(() => {
        const settingsRef = doc(db, 'settings', 'global');
        const unsubscribe = onSnapshot(settingsRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data() as Settings;
                setSettings(data);
                setMinPayout(data.minPayout.toString());
                setRulesToMonetize(data.rulesToMonetize.toString());
            } else {
                // Default values if not set
                setSettings({ minPayout: 10, rulesToMonetize: 3 });
                setMinPayout('10');
                setRulesToMonetize('3');
            }
            setLoadingSettings(false);
        });
        return () => unsubscribe();
    }, []);

    const handleCpmUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        const rate = parseFloat(newCpm);
        if (isNaN(rate) || rate <= 0) {
            toast({ title: 'Invalid CPM Rate', description: 'Please enter a valid positive number.', variant: 'destructive' });
            return;
        }

        setIsSubmittingCpm(true);
        try {
            const batch = writeBatch(db);
            const now = serverTimestamp();

            // Find the current active CPM to end its period
            const cpmQuery = query(collection(db, 'cpmHistory'), where('endDate', '==', null));
            const cpmSnapshot = await getDocs(cpmQuery);
            if (!cpmSnapshot.empty) {
                const currentCpmDocRef = cpmSnapshot.docs[0].ref;
                batch.update(currentCpmDocRef, { endDate: now });
            }

            // Create the new CPM entry
            const newCpmRef = doc(collection(db, 'cpmHistory'));
            batch.set(newCpmRef, {
                rate,
                startDate: now,
                endDate: null,
            });
            
            await batch.commit();

            toast({ title: 'CPM Rate Updated', description: `The new CPM rate of $${rate.toFixed(4)} is now active.` });
            setNewCpm('');

        } catch (error) {
            console.error("Error updating CPM: ", error);
            toast({ title: 'Error', description: 'There was a problem updating the CPM rate.', variant: 'destructive' });
        } finally {
            setIsSubmittingCpm(false);
        }
    };
    
     const handleSettingsUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        const payout = parseInt(minPayout, 10);
        const rules = parseInt(rulesToMonetize, 10);

        if (isNaN(payout) || payout < 0 || isNaN(rules) || rules < 0) {
            toast({ title: 'Invalid Values', description: 'Please enter valid numbers for the settings.', variant: 'destructive' });
            return;
        }

        setIsSubmittingSettings(true);
        try {
            const settingsRef = doc(db, 'settings', 'global');
            await setDoc(settingsRef, {
                minPayout: payout,
                rulesToMonetize: rules,
            }, { merge: true });

            toast({ title: 'Settings Updated', description: 'Global application settings have been saved.' });
        } catch (error) {
            console.error("Error updating settings: ", error);
            toast({ title: 'Error', description: 'There was a problem saving the settings.', variant: 'destructive' });
        } finally {
            setIsSubmittingSettings(false);
        }
    };


    return (
        <div className="flex flex-col gap-8">
            <h1 className="text-2xl font-bold">System Settings</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                     <form onSubmit={handleCpmUpdate}>
                        <CardHeader>
                            <CardTitle>CPM Rate</CardTitle>
                            <CardDescription>Manage the Cost Per Mille (1000 views) for monetized links.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             {loadingCpm ? <Skeleton className="h-10 w-1/2" /> : (
                                <div className="text-4xl font-bold">
                                    {activeCpm !== null ? `$${activeCpm.toFixed(4)}` : '$0.0000'}
                                    <span className="text-base font-normal text-muted-foreground ml-2">/ 1000 views</span>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="new-cpm">Set New CPM Rate</Label>
                                <Input 
                                    id="new-cpm" 
                                    type="number" 
                                    step="0.0001" 
                                    placeholder="e.g. 3.50"
                                    value={newCpm}
                                    onChange={(e) => setNewCpm(e.target.value)}
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isSubmittingCpm}>
                                {isSubmittingCpm && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Update CPM
                            </Button>
                        </CardFooter>
                     </form>
                </Card>

                 <Card>
                    <form onSubmit={handleSettingsUpdate}>
                        <CardHeader>
                            <CardTitle>Global Monetization Rules</CardTitle>
                            <CardDescription>Configure rules that affect all users and links.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="min-payout">Minimum Payout Amount ($)</Label>
                                {loadingSettings ? <Skeleton className="h-10" /> : (
                                    <Input
                                        id="min-payout"
                                        type="number"
                                        placeholder="e.g. 10"
                                        value={minPayout}
                                        onChange={(e) => setMinPayout(e.target.value)}
                                    />
                                )}
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="rules-monetize">Rules to Monetize</Label>
                                 {loadingSettings ? <Skeleton className="h-10" /> : (
                                    <Input
                                        id="rules-monetize"
                                        type="number"
                                        placeholder="e.g. 3"
                                        value={rulesToMonetize}
                                        onChange={(e) => setRulesToMonetize(e.target.value)}
                                    />
                                 )}
                            </div>
                        </CardContent>
                        <CardFooter>
                             <Button type="submit" disabled={isSubmittingSettings}>
                                {isSubmittingSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Settings
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>CPM History</CardTitle>
                    <CardDescription>View the history of CPM rate changes in the <a href="/admin/cpm-history" className="text-primary underline">CPM History page</a>.</CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
}

    