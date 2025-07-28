
'use client';

import { useState } from 'react';
import { useUser } from '@/hooks/use-user';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Loader2, DollarSign, Wallet, PiggyBank } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const MIN_PAYOUT_AMOUNT = 10;

export default function PayoutsPage() {
    const { user, profile, loading, payouts, payoutsPending, paidEarnings, availableBalance } = useUser();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form state
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('');
    const [details, setDetails] = useState('');

    const resetForm = () => {
        setAmount('');
        setMethod('');
        setDetails('');
        setIsDialogOpen(false);
    };

    const handlePayoutRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !profile || typeof availableBalance !== 'number') return;
        
        const payoutAmount = parseFloat(amount);
        if (isNaN(payoutAmount) || payoutAmount <= 0) {
            toast({ title: 'Invalid Amount', description: 'Please enter a valid amount.', variant: 'destructive' });
            return;
        }
        if (payoutAmount < MIN_PAYOUT_AMOUNT) {
             toast({ title: 'Amount too low', description: `The minimum payout amount is $${MIN_PAYOUT_AMOUNT}.`, variant: 'destructive' });
            return;
        }
        if (payoutAmount > availableBalance) {
            toast({ title: 'Insufficient Balance', description: 'You cannot request more than your available balance.', variant: 'destructive' });
            return;
        }
        if (!method) {
            toast({ title: 'Payment Method Required', description: 'Please select a payment method.', variant: 'destructive' });
            return;
        }
        if (!details.trim()) {
            toast({ title: 'Payment Details Required', description: 'Please provide your payment details (e.g., email or phone number).', variant: 'destructive' });
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


    if (loading) {
        return (
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-semibold md:text-2xl">Payouts</h1>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                </div>
                 <Skeleton className="h-10 w-40" />
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                     <CardContent>
                        <Skeleton className="h-40 w-full" />
                     </CardContent>
                 </Card>
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
                        <div className="text-2xl font-bold">${typeof availableBalance === 'number' ? availableBalance.toFixed(4) : '0.0000'}</div>
                        <p className="text-xs text-muted-foreground">Ready for withdrawal</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${typeof payoutsPending === 'number' ? payoutsPending.toFixed(4) : '0.0000'}</div>
                        <p className="text-xs text-muted-foreground">Requested but not yet paid</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Lifetime Paid</CardTitle>
                        <PiggyBank className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${typeof paidEarnings === 'number' ? paidEarnings.toFixed(4) : '0.0000'}</div>
                        <p className="text-xs text-muted-foreground">Total earnings paid out to you</p>
                    </CardContent>
                </Card>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button disabled={typeof availableBalance !== 'number' || availableBalance < MIN_PAYOUT_AMOUNT} className="font-semibold">
                        Request a Payout
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <form onSubmit={handlePayoutRequest}>
                        <DialogHeader>
                            <DialogTitle>Request a Payout</DialogTitle>
                            <DialogDescription>
                                Minimum payout is ${MIN_PAYOUT_AMOUNT}.00. Requests are processed within 3-5 business days.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                             <div className="space-y-2">
                                <Label>Amount ($)</Label>
                                <Input required type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={`e.g. ${typeof availableBalance === 'number' ? availableBalance.toFixed(2) : ''}`} step="0.01" />
                            </div>
                            <div className="space-y-2">
                                <Label>Payment Method</Label>
                                <Select required onValueChange={setMethod} value={method}>
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
                                <Input required value={details} onChange={e => setDetails(e.target.value)} placeholder="Your PayPal email or phone number" />
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
                    <CardTitle className="text-xl">Payout History</CardTitle>
                    <CardDescription>A record of all your payout requests.</CardDescription>
                </CardHeader>
                <CardContent>
                   <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-1/3 sm:w-auto">Date</TableHead>
                                <TableHead className="hidden sm:table-cell">Amount</TableHead>
                                <TableHead className="hidden sm:table-cell">Method</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && (
                                <TableRow><TableCell colSpan={4} className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                            )}
                            {!loading && payouts.length > 0 ? (
                                payouts.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell>
                                            <div className="font-medium">
                                                {p.requestedAt ? new Date(p.requestedAt.seconds * 1000).toLocaleDateString() : 'Processing...'}
                                            </div>
                                            <div className="sm:hidden mt-1 font-semibold">${p.amount.toFixed(4)}</div>
                                        </TableCell>
                                        <TableCell className="font-semibold hidden sm:table-cell">${p.amount.toFixed(4)}</TableCell>
                                        <TableCell className="capitalize hidden sm:table-cell">{p.method}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={p.status === 'pending' ? 'secondary' : p.status === 'completed' ? 'default' : 'destructive'}
                                                className={p.status === 'completed' ? 'bg-green-600' : ''}
                                            >
                                                {p.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                !loading && <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No payout requests yet.</TableCell></TableRow>
                            )}
                        </TableBody>
                   </Table>
                </CardContent>
            </Card>

        </div>
    );
}
