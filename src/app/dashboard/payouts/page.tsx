
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/use-user';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Loader2, DollarSign, Wallet, PiggyBank } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { LinkItem } from '../page';


type PayoutRequest = {
    id: string;
    amount: number;
    method: string;
    details: string;
    status: 'pending' | 'completed' | 'rejected';
    requestedAt: any;
}

export default function PayoutsPage() {
    const { user, profile, loading } = useUser();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form state
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('');
    const [details, setDetails] = useState('');
    
    // Payout history
    const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
    const [payoutsLoading, setPayoutsLoading] = useState(true);

    // Settings
    const [minPayoutAmount, setMinPayoutAmount] = useState(10);
    const [cpm, setCpm] = useState(3.00);
    const [links, setLinks] = useState<LinkItem[]>([]);
    
    useEffect(() => {
        const fetchSettings = async () => {
             const settingsRef = doc(db, 'settings', 'global');
             const docSnap = await getDoc(settingsRef);
             if (docSnap.exists()) {
                 const settingsData = docSnap.data();
                 setMinPayoutAmount(settingsData.minPayout || 10);
                 setCpm(settingsData.cpm || 3.00);
             }
        }
        fetchSettings();
    }, [])

    useEffect(() => {
        if (user) {
            setPayoutsLoading(true);
            const payoutQuery = query(collection(db, "payoutRequests"), where("userId", "==", user.uid));
            const unsubPayouts = onSnapshot(q, (snapshot) => {
                const requests: PayoutRequest[] = [];
                snapshot.forEach(doc => {
                    requests.push({ id: doc.id, ...doc.data() } as PayoutRequest);
                });
                setPayouts(requests.sort((a,b) => (b.requestedAt?.seconds ?? 0) - (a.requestedAt?.seconds ?? 0)));
                setPayoutsLoading(false);
            });
            
            const q = query(collection(db, "links"), where("userId", "==", user.uid));
            const unsubLinks = onSnapshot(q, (querySnapshot) => {
                const linksData: LinkItem[] = [];
                querySnapshot.forEach((doc) => {
                    linksData.push({ id: doc.id, ...doc.data() } as LinkItem);
                });
                setLinks(linksData);
            });

            return () => {
                unsubPayouts();
                unsubLinks();
            }
        }
    }, [user]);
    
    const generatedEarnings = links.reduce((acc, link) => {
        if (link.monetizable && link.realClicks > 0) {
            return acc + (link.realClicks / 1000) * cpm;
        }
        return acc;
    }, 0);

    const paidEarnings = profile?.paidEarnings ?? 0;
    
    const payoutsPending = payouts
        .filter(p => p.status === 'pending')
        .reduce((acc, p) => acc + p.amount, 0);

    const availableBalance = generatedEarnings - paidEarnings - payoutsPending;

    const resetForm = () => {
        setAmount('');
        setMethod('');
        setDetails('');
        setIsDialogOpen(false);
    };

    const handlePayoutRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !profile) return;
        
        const payoutAmount = parseFloat(amount);
        if (isNaN(payoutAmount) || payoutAmount <= 0) {
            toast({ title: 'Invalid Amount', description: 'Please enter a valid amount.', variant: 'destructive' });
            return;
        }
        if (payoutAmount < minPayoutAmount) {
             toast({ title: 'Amount too low', description: `The minimum payout amount is $${minPayoutAmount}.`, variant: 'destructive' });
            return;
        }
        if (payoutAmount > availableBalance) {
            toast({ title: 'Insufficient Balance', description: 'You cannot request more than your available balance.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'payoutRequests'), {
                userId: user.uid,
                userEmail: user.email,
                userName: profile.displayName,
                amount: payoutAmount,
                method,
                details,
                status: 'pending',
                requestedAt: serverTimestamp(),
            });

            toast({ title: 'Request Submitted!', description: 'Your payout request has been sent for review.' });
            resetForm();

        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to submit payout request.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };


    if (loading || payoutsLoading) {
        return (
            <div className="flex flex-col gap-6">
                <Skeleton className="h-8 w-32" />
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                </div>
                 <Skeleton className="h-20" />
                 <Skeleton className="h-60" />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold md:text-2xl">Payouts</h1>
            </div>

             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${availableBalance.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Ready for withdrawal</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${payoutsPending.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Requested but not yet paid</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Lifetime Paid</CardTitle>
                        <PiggyBank className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${paidEarnings.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Total earnings paid out to you</p>
                    </CardContent>
                </Card>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button disabled={availableBalance < minPayoutAmount} className="font-semibold">
                        Request a Payout
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <form onSubmit={handlePayoutRequest}>
                        <DialogHeader>
                            <DialogTitle>Request a Payout</DialogTitle>
                            <DialogDescription>
                                Minimum payout is ${minPayoutAmount}.00. Requests are processed within 3-5 business days.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                             <div className="space-y-2">
                                <Label>Amount ($)</Label>
                                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={`e.g. ${availableBalance.toFixed(2)}`} step="0.01" />
                            </div>
                            <div className="space-y-2">
                                <Label>Payment Method</Label>
                                <Select onValueChange={setMethod} value={method}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="paypal">PayPal</SelectItem>
                                        <SelectItem value="nequi">Nequi</SelectItem>
                                        <SelectItem value="daviplata">Daviplata</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Payment Details</Label>
                                <Input value={details} onChange={e => setDetails(e.target.value)} placeholder="Your PayPal email or phone number" />
                            </div>
                        </div>
                        <DialogFooter>
                             <DialogClose asChild>
                                <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
                             </DialogClose>
                             <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Submit Request
                             </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

             <Card>
                <CardHeader>
                    <CardTitle>Payout History</CardTitle>
                    <CardDescription>A record of all your payout requests.</CardDescription>
                </CardHeader>
                <CardContent>
                   <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payoutsLoading ? (
                                <TableRow><TableCell colSpan={4} className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                            ) : payouts.length > 0 ? (
                                payouts.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell>{p.requestedAt ? new Date(p.requestedAt.seconds * 1000).toLocaleDateString() : 'Processing...'}</TableCell>
                                        <TableCell className="font-medium">${p.amount.toFixed(2)}</TableCell>
                                        <TableCell className="capitalize">{p.method}</TableCell>
                                        <TableCell>
                                            <Badge variant={p.status === 'pending' ? 'secondary' : p.status === 'completed' ? 'default' : 'destructive'}
                                                className={p.status === 'completed' ? 'bg-green-600' : ''}
                                            >
                                                {p.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No payout requests yet.</TableCell></TableRow>
                            )}
                        </TableBody>
                   </Table>
                </CardContent>
            </Card>

        </div>
    );
}
