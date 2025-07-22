
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
import { MoreVertical, UserX, UserCheck, Eye, Loader2, DollarSign } from 'lucide-react';
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

const CPM = 3.00;

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

        let totalClicks = 0;
        linksSnapshot.forEach(linkDoc => {
            totalClicks += linkDoc.data().clicks || 0;
        });

        const generatedEarnings = (totalClicks / 1000) * CPM;

        usersData.push({
          uid: userDoc.id,
          displayName: userData.displayName,
          email: userData.email,
          photoURL: userData.photoURL,
          role: userData.role,
          linksCount: linksSnapshot.size,
          generatedEarnings,
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
    setBalanceAmount(user.paidEarnings.toFixed(2));
    setIsAddBalanceDialogOpen(true);
  }

  const handleSetBalance = async () => {
    if (!selectedUser || balanceAmount === '') return;
    
    const newBalance = parseFloat(balanceAmount);
    if (isNaN(newBalance)) {
        toast({ title: 'Invalid amount', description: 'Please enter a valid number.', variant: 'destructive' });
        return;
    }

    setIsSubmitting(true);
    try {
        const userDocRef = doc(db, 'users', selectedUser.uid);
        await updateDoc(userDocRef, { paidEarnings: newBalance });
        
        toast({
            title: 'Balance Updated',
            description: `Successfully set ${selectedUser.displayName}'s balance to $${newBalance.toFixed(2)}.`,
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
                        <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                        <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                        <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                        <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                        <TableHead><Skeleton className="h-5 w-16" /></TableHead>
                        <TableHead className="text-right"><Skeleton className="h-5 w-20" /></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(5)].map((_, i) => (
                         <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
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
                            <TableHead>Links Created</TableHead>
                            <TableHead>Generated Earnings</TableHead>
                            <TableHead>Paid Earnings</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((u) => (
                            <TableRow key={u.uid}>
                                <TableCell className="font-medium">
                                    <div className="font-semibold">{u.displayName}</div>
                                    <div className="text-sm text-muted-foreground">{u.email}</div>
                                </TableCell>
                                <TableCell>{u.linksCount}</TableCell>
                                <TableCell>${u.generatedEarnings.toFixed(2)}</TableCell>
                                <TableCell className="text-green-500 font-semibold">${u.paidEarnings.toFixed(2)}</TableCell>
                                <TableCell>
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
                                                <span>Add/Edit Balance</span>
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
                    <DialogTitle>Add/Edit Balance for {selectedUser?.displayName}</DialogTitle>
                    <DialogDescription>
                        Set the total paid earnings for this user. This will overwrite the current value.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="balance-amount">Total Paid Balance ($)</Label>
                        <Input 
                            id="balance-amount"
                            type="number"
                            value={balanceAmount}
                            onChange={(e) => setBalanceAmount(e.target.value)}
                            placeholder="e.g. 50.00"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary" onClick={() => setIsAddBalanceDialogOpen(false)}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button onClick={handleSetBalance} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Set Balance
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  );
}
