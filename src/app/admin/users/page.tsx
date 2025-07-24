
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
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, query, where, getDocs, serverTimestamp, increment } from 'firebase/firestore';
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
import { MoreVertical, UserX, UserCheck, Eye, Loader2, DollarSign, Link2, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type UserProfile = {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: 'user' | 'admin';
  linksCount: number;
  generatedEarnings: number;
  paidEarnings: number;
  monetizationStatus: 'active' | 'inactive';
};

export default function AdminUsersPage() {
  const { user } = useUser();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Balance Dialog State
  const [isAddBalanceDialogOpen, setIsAddBalanceDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [balanceAmount, setBalanceAmount] = useState('');


  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), async (snapshot) => {
      setLoading(true);
      const usersData: UserProfile[] = [];
      
      for (const userDoc of snapshot.docs) {
        const userData = userDoc.data();
        const linksQuery = query(collection(db, 'links'), where('userId', '==', userDoc.id));
        const linksSnapshot = await getDocs(linksQuery);

        usersData.push({
          uid: userDoc.id,
          displayName: userData.displayName,
          email: userData.email,
          photoURL: userData.photoURL,
          role: userData.role,
          linksCount: linksSnapshot.size,
          generatedEarnings: userData.generatedEarnings || 0,
          paidEarnings: userData.paidEarnings || 0,
          monetizationStatus: 'active', // Placeholder
        });
      }

      setUsers(usersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openAddBalanceDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setBalanceAmount(''); // Reset amount on open
    setIsAddBalanceDialogOpen(true);
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
        await updateDoc(userDocRef, { generatedEarnings: increment(amountToAdd) });
        
        toast({
            title: 'Balance Added',
            description: `Successfully added $${amountToAdd.toFixed(4)} to ${selectedUser.displayName}'s balance.`,
        });
        
        setIsAddBalanceDialogOpen(false);
        setSelectedUser(null);
        setBalanceAmount('');
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


  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">User Management</h1>
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
        <h1 className="text-2xl font-bold">User Management</h1>
        <Card>
            <CardHeader>
                <CardTitle>Registered Users</CardTitle>
                <CardDescription>View and manage all users in the system.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead className="hidden md:table-cell">Stats</TableHead>
                            <TableHead className="hidden sm:table-cell">Balance</TableHead>
                            <TableHead className="hidden sm:table-cell">Role</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((u) => (
                            <TableRow key={u.uid}>
                                <TableCell className="font-medium">
                                    <div className="font-semibold">{u.displayName}</div>
                                    <div className="text-sm text-muted-foreground">{u.email}</div>
                                    {/* Mobile view */}
                                    <div className="sm:hidden mt-2 space-y-2 text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">Balance:</span>
                                            <span className="font-bold">${(u.generatedEarnings - u.paidEarnings).toFixed(4)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">Role:</span>
                                            <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className={`h-5 ${u.role === 'admin' ? 'bg-primary' : ''}`}>
                                                {u.role}
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
                                <TableCell className="hidden sm:table-cell">
                                    <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className={u.role === 'admin' ? 'bg-primary' : ''}>
                                        {u.role}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem disabled>
                                                <Eye className="mr-2 h-4 w-4" />
                                                <span>View Details</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => openAddBalanceDialog(u)}>
                                                <DollarSign className="mr-2 h-4 w-4" />
                                                <span>Add Balance</span>
                                            </DropdownMenuItem>
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
                        Enter the amount you want to add to the user's generated earnings. This will be added to their current balance.
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
                        Current Balance: ${selectedUser ? (selectedUser.generatedEarnings - selectedUser.paidEarnings).toFixed(4) : '0.0000'}
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary" onClick={() => setIsAddBalanceDialogOpen(false)}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button onClick={handleAddBalance} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Balance
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  );
}
