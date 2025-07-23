
'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, orderBy, limit, writeBatch, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type MonetizationSettings = {
    cpm: number;
    minPayout: number;
    rulesToMonetize: number;
};

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<MonetizationSettings>({ cpm: 0, minPayout: 0, rulesToMonetize: 0 });
    const [initialCpm, setInitialCpm] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const settingsRef = doc(db, 'settings', 'global');
                const docSnap = await getDoc(settingsRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as MonetizationSettings;
                    setSettings(data);
                    setInitialCpm(data.cpm);
                } else {
                    // Set default values if not found
                    setSettings({ cpm: 3.00, minPayout: 10, rulesToMonetize: 3 });
                    setInitialCpm(3.00);
                }
            } catch (error) {
                toast({ title: 'Error fetching settings', variant: 'destructive' });
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [toast]);

    const handleSave = async () => {
        setIsSaving(true);
        const batch = writeBatch(db);
        const settingsRef = doc(db, 'settings', 'global');

        try {
            // Update the main settings document
            batch.update(settingsRef, settings);
            
            // Check if CPM has changed to manage history
            if (initialCpm !== null && settings.cpm !== initialCpm) {
                 // Find the last CPM entry to set its end date
                const lastCpmQuery = query(collection(db, 'cpmHistory'), orderBy('startDate', 'desc'), limit(1));
                const lastCpmSnapshot = await getDocs(lastCpmQuery);
                
                if (!lastCpmSnapshot.empty) {
                    const lastCpmDoc = lastCpmSnapshot.docs[0];
                    batch.update(lastCpmDoc.ref, { endDate: serverTimestamp() });
                }

                // Create a new CPM history entry
                const newCpmHistoryRef = doc(collection(db, 'cpmHistory'));
                batch.set(newCpmHistoryRef, {
                    rate: settings.cpm,
                    startDate: serverTimestamp()
                });
            }

            await batch.commit();

            setInitialCpm(settings.cpm); // Update initial CPM for next comparison
            toast({ title: 'Settings Saved', description: 'Global settings have been updated.' });

        } catch (error) {
            console.error("Error saving settings:", error);
            toast({ title: 'Error saving settings', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setSettings(prev => ({...prev, [id]: parseFloat(value) || 0 }))
    }

    if (loading) {
        return (
            <div className="flex flex-col gap-6">
                <h1 className="text-2xl font-bold">System Settings</h1>
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold">System Settings</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Monetization Settings</CardTitle>
                    <CardDescription>
                        Control the core financial parameters of the application.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="cpm">CPM Rate ($)</Label>
                        <p className="text-sm text-muted-foreground">Cost Per Mille. The amount paid per 1000 monetized clicks. Changing this creates a new entry in CPM history.</p>
                        <Input id="cpm" type="number" value={settings.cpm} onChange={handleInputChange} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="minPayout">Minimum Payout Amount ($)</Label>
                         <p className="text-sm text-muted-foreground">The minimum balance a user must have to request a payout.</p>
                        <Input id="minPayout" type="number" value={settings.minPayout} onChange={handleInputChange} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="rulesToMonetize">Rules to Monetize</Label>
                         <p className="text-sm text-muted-foreground">The number of rules a link needs to be considered monetizable.</p>
                        <Input id="rulesToMonetize" type="number" value={settings.rulesToMonetize} onChange={handleInputChange} />
                    </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                     <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Settings
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
