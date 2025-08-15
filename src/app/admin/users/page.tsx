

/**
 * !! ANTES DE EDITAR ESTE ARCHIVO, REVISA LAS DIRECTRICES EN LOS SIGUIENTES DOCUMENTOS: !!
 * - /README.md
 * - /src/AGENTS.md
 * 
 * Este componente es una parte crítica del panel de administración para gestionar usuarios.
 * Un cambio incorrecto aquí puede afectar la capacidad de los administradores para ver o gestionar usuarios.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, query, where, getDocs, serverTimestamp, increment, orderBy, writeBatch } from 'firebase/firestore';
import { useUser } from '@/hooks/use-user';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { MoreVertical, UserX, UserCheck, Eye, Loader2, DollarSign, Link2, Wallet, History, ShieldBan, Pencil } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose
  } from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PayoutRequest } from '@/hooks/use-user';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/hooks/use-user';


export default function AdminUsersPage() {
  const { user } = useUser();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog States
  const [isAddBalanceDialogOpen, setIsAddBalanceDialogOpen] = useState(false);
  const [isCustomCpmDialogOpen, setIsCustomCpmDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [customCpmAmount, setCustomCpmAmount] = useState('');
  const [isPayoutHistoryDialogOpen, setIsPayoutHistoryDialogOpen] = useState(false);
  const [payoutHistory, setPayoutHistory] = useState<PayoutRequest[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);


  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), async (snapshot) => {
      setLoading(true);
      const usersData: UserProfile[] = [];
      
      for (const userDoc of snapshot.docs) {
        const userData = userDoc.data();
        const linksQuery = query(collection(db, 'links'), where('userId', '==', userDoc.id));
        const linksSnapshot = await getDocs(linksQuery);

        const totalGeneratedEarnings = linksSnapshot.docs.reduce((acc, doc) => {
            return acc + (doc.data().generatedEarnings || 0);
        }, 0);

        usersData.push({
          uid: userDoc.id,
          displayName: userData.displayName,
          email: userData.email,
          photoURL: userData.photoURL,
          role: userData.role,
          linksCount: linksSnapshot.size,
          generatedEarnings: totalGeneratedEarnings,
          paidEarnings: userData.paidEarnings || 0,
          accountStatus: userData.accountStatus || 'active',
          customCpm: userData.customCpm,
        });
      }

      setUsers(usersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openAddBalanceDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setBalanceAmount('');
    setIsAddBalanceDialogOpen(true);
  }

  const openCustomCpmDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setCustomCpmAmount(user.customCpm?.toString() || '');
    setIsCustomCpmDialogOpen(true);
  }

  const handleAddBalance = async () => {
    if (!selectedUser || balanceAmount === '') return;
    
    const amountToAdd = parseFloat(balanceAmount);
    if (isNaN(amountToAdd) || amountToAdd <= 0) {
        toast({ title: 'Invalid amount', description: 'Please enter a valid positive number.', variant: 'destructive' });
        return;
    }

    setIsSubmitting(true);
    try {
        const userDocRef = doc(db, 'users', selectedUser.uid);
        await updateDoc(userDocRef, { paidEarnings: increment(-amountToAdd) });
        
        toast({
            title: 'Balance Added',
            description: `Successfully added $${amountToAdd.toFixed(4)} to ${selectedUser.displayName}'s balance.`,
        });
        
        setIsAddBalanceDialogOpen(false);
    } catch (error) {
         toast({
            title: 'Error updating balance',
            description: 'There was a problem updating the user balance.',
            variant: 'destructive',
        });
    } finally {
        setIsSubmitting(false);
    }
  }

   const handleSetCustomCpm = async () => {
    if (!selectedUser) return;
    
    const parsedCpm = parseFloat(customCpmAmount);
    // Treat empty string or "0" as a reason to remove the custom CPM.
    const newCpm = customCpmAmount === '' || parsedCpm === 0 ? null : parsedCpm;

    if (newCpm !== null && (isNaN(newCpm) || newCpm < 0)) {
        toast({ title: 'Invalid CPM', description: 'Please enter a valid positive number or leave it blank to remove.', variant: 'destructive' });
        return;
    }

    setIsSubmitting(true);
    try {
        const batch = writeBatch(db);
        const userDocRef = doc(db, 'users', selectedUser.uid);
        batch.update(userDocRef, { customCpm: newCpm });

        // Create notification for the user
        const notificationRef = doc(collection(db, 'notifications'));
        const notificationMessage = newCpm !== null 
            ? `Your CPM rate has been updated to $${newCpm.toFixed(4)}!`
            : `Your custom CPM rate has been removed. You are now on the global rate.`;
        
        batch.set(notificationRef, {
            userId: selectedUser.uid,
            type: 'custom_cpm_set',
            message: notificationMessage,
            createdAt: serverTimestamp(),
            isRead: false,
        });

        await batch.commit();

        toast({
            title: 'Custom CPM Updated',
            description: newCpm === null 
                ? `Removed custom CPM for ${selectedUser.displayName}. They have been notified.` 
                : `Set custom CPM for ${selectedUser.displayName} to $${newCpm.toFixed(4)}. They have been notified.`,
        });
        setIsCustomCpmDialogOpen(false);
    } catch (error) {
         toast({ title: 'Error', description: 'Could not update custom CPM.', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  }

  const openPayoutHistoryDialog = async (user: UserProfile) => {
    setSelectedUser(user);
    setIsPayoutHistoryDialogOpen(true);
    setHistoryLoading(true);
    try {
        const q = query(collection(db, 'payoutRequests'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const historyData = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as PayoutRequest))
            .sort((a, b) => (b.requestedAt?.seconds ?? 0) - (a.requestedAt?.seconds ?? 0));
            
        setPayoutHistory(historyData);
    } catch (error) {
        console.error("Error fetching payout history: ", error);
        toast({ title: 'Error', description: 'Could not fetch payout history.', variant: 'destructive' });
    } finally {
        setHistoryLoading(false);
    }
  };

  const handleToggleAccountStatus = async (userToUpdate: UserProfile) => {
    if (!user || user.uid === userToUpdate.uid || userToUpdate.role === 'admin') {
         toast({ title: 'Action Not Allowed', description: 'Administrators cannot be suspended.', variant: 'destructive' });
        return;
    }

    const newStatus = userToUpdate.accountStatus === 'active' ? 'suspended' : 'active';
    const actionText = newStatus === 'suspended' ? 'suspend' : 'reactivate';

    try {
        const userDocRef = doc(db, 'users', userToUpdate.uid);
        await updateDoc(userDocRef, { accountStatus: newStatus });
        toast({
            title: `User ${actionText}d`,
            description: `${userToUpdate.displayName}'s account has been ${actionText}d.`,
        });
    } catch (error) {
        toast({ title: 'Error', description: `Could not ${actionText} the user.`, variant: 'destructive' });
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl sm:text-2xl font-bold">User Management</h1>
        <Card>
          <CardHeader>
             <Skeleton className="h-6 w-48" />
             <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        {[...Array(7)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-24" /></TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(5)].map((_, i) => (
                         <TableRow key={i}>
                            {[...Array(6)].map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
                            <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                         </TableRow>
                    ))}
                </TableBody>
             </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
        <div className="flex flex-col gap-4">
        <h1 className="text-xl sm:text-2xl font-bold">User Management</h1>
        <Card>
            <CardHeader>
                <CardTitle className="text-xl">Registered Users</CardTitle>
                <CardDescription>View and manage all users in the system.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead className="hidden md:table-cell">Stats</TableHead>
                            <TableHead className="hidden sm:table-cell">Balance</TableHead>
                            <TableHead className="hidden md:table-cell">CPM</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((u) => (
                            <TableRow key={u.uid} className={u.accountStatus === 'suspended' ? 'bg-destructive/10' : ''}>
                                                                <TableCell className="font-medium">
                                                                        <div className="font-semibold">
                                                                            <Link href={`/admin/users/${u.uid}`} className="text-blue-600 hover:underline">
                                                                                {u.displayName}
                                                                            </Link>
                                                                        </div>
                                                                        <div className="text-sm text-muted-foreground">{u.email}</div>
                                    <div className="sm:hidden mt-2 space-y-2 text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">Balance:</span>
                                            <span className="font-bold">${(u.generatedEarnings - u.paidEarnings).toFixed(4)}</span>
                                        </div>
                                         <div className="flex items-center gap-2">
                                            <span className="font-medium">Status:</span>
                                            <Badge variant={u.accountStatus === 'active' ? 'default' : 'destructive'} className={`${u.accountStatus === 'active' ? 'bg-green-600' : ''}`}>
                                                {u.accountStatus}
                                            </Badge>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                    <div className="flex flex-col gap-1 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Link2 className="h-3 w-3 text-muted-foreground" />
                                            <span>{u.linksCount} links</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                                            <span>${u.generatedEarnings.toFixed(4)} generated</span>
                                        </div>
                                         <div className="flex items-center gap-2 text-green-500">
                                            <Wallet className="h-3 w-3" />
                                            <span>${u.paidEarnings.toFixed(4)} paid</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="font-bold hidden sm:table-cell">${(u.generatedEarnings - u.paidEarnings).toFixed(4)}</TableCell>
                                <TableCell className="hidden md:table-cell">
                                    {u.customCpm ? (
                                        <Badge variant="outline" className="border-blue-500 text-blue-500">${u.customCpm.toFixed(4)}</Badge>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">Global</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col items-start gap-1">
                                         <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className={u.role === 'admin' ? 'bg-primary' : ''}>
                                            {u.role}
                                        </Badge>
                                        <Badge variant={u.accountStatus === 'active' ? 'default' : 'destructive'} className={`${u.accountStatus === 'active' ? 'bg-green-600' : ''}`}>
                                            {u.accountStatus}
                                        </Badge>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                             <DropdownMenuItem onClick={() => openCustomCpmDialog(u)}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                <span>Set Custom CPM</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => openAddBalanceDialog(u)}>
                                                <DollarSign className="mr-2 h-4 w-4" />
                                                <span>Add Balance</span>
                                            </DropdownMenuItem>
                                             <DropdownMenuItem onClick={() => openPayoutHistoryDialog(u)}>
                                                <History className="mr-2 h-4 w-4" />
                                                <span>Payout History</span>
                                            </DropdownMenuItem>
                                             <DropdownMenuSeparator />
                                             {u.role !== 'admin' && user?.uid !== u.uid && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <div className={cn("relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", u.accountStatus === 'suspended' ? 'text-green-500' : 'text-destructive')}>
                                                          {u.accountStatus === 'suspended' ? <UserCheck className="mr-2 h-4 w-4" /> : <UserX className="mr-2 h-4 w-4" />}
                                                          <span>{u.accountStatus === 'suspended' ? 'Reactivate' : 'Suspend'} User</span>
                                                        </div>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This action will {u.accountStatus === 'active' ? 'suspend' : 'reactivate'} the user account for <span className="font-bold">{u.displayName}</span>. 
                                                                {u.accountStatus === 'active' ? ' They will not be able to log in.' : ' They will regain access to their account.'}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleToggleAccountStatus(u)}>
                                                                Continue
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                        </DropdownMenuContent>
                                </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        </div>

        {/* Add Balance Dialog */}
        <Dialog open={isAddBalanceDialogOpen} onOpenChange={setIsAddBalanceDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Balance to {selectedUser?.displayName}</DialogTitle>
                    <DialogDescription>
                        This amount will be SUBTRACTED from the user's "Paid Earnings", effectively increasing their available balance. Use this to add bonuses or correct balances.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="balance-amount">Amount to Add ($)</Label>
                        <Input 
                            id="balance-amount"
                            type="number"
                            value={balanceAmount}
                            onChange={(e) => setBalanceAmount(e.target.value)}
                            placeholder="e.g. 50.00"
                        />
                    </div>
                     <div className="text-sm text-muted-foreground">
                        Current Available Balance: ${selectedUser ? (selectedUser.generatedEarnings - selectedUser.paidEarnings).toFixed(4) : '0.0000'}
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleAddBalance} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Balance
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Custom CPM Dialog */}
        <Dialog open={isCustomCpmDialogOpen} onOpenChange={setIsCustomCpmDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Set Custom CPM for {selectedUser?.displayName}</DialogTitle>
                    <DialogDescription>
                        Set a specific CPM rate for this user. This will override the global rate for all their links. Leave blank or set to 0 to remove the custom CPM.
                    </DialogDescription>
                </DialogHeader>
                 <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="cpm-amount">Custom CPM Rate ($)</Label>
                        <Input 
                            id="cpm-amount"
                            type="number"
                            value={customCpmAmount}
                            onChange={(e) => setCustomCpmAmount(e.target.value)}
                            placeholder="e.g. 4.50 (or 0 to remove)"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleSetCustomCpm} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save CPM
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Payout History Dialog */}
        <Dialog open={isPayoutHistoryDialogOpen} onOpenChange={setIsPayoutHistoryDialogOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Payout History for {selectedUser?.displayName}</DialogTitle>
                    <DialogDescription>
                        A log of all completed and rejected payments for this user.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    {historyLoading ? (
                        <div className="flex justify-center items-center h-40">
                             <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : payoutHistory.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Method & Details</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payoutHistory.map((payout) => (
                                    <TableRow key={`${selectedUser?.uid}-${payout.id}`}>
                                        <TableCell>{payout.requestedAt ? new Date(payout.requestedAt.seconds * 1000).toLocaleString() : 'N/A'}</TableCell>
                                        <TableCell className="font-semibold">${payout.amount.toFixed(4)}</TableCell>
                                        <TableCell>
                                            <div className="capitalize font-medium">{payout.method}</div>
                                            <div className="text-xs text-muted-foreground">{payout.details}</div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                             <Badge variant={payout.status === 'completed' ? 'default' : 'destructive'} className={payout.status === 'completed' ? 'bg-green-600' : ''}>
                                                {payout.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-center text-muted-foreground py-10">No payouts found for this user.</p>
                    )}
                </div>
                 <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  );
}
