
'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, query, where, getDocs } from 'firebase/firestore';
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
import { MoreVertical, UserX, UserCheck, Eye, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';

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
          paidEarnings: 0, // Placeholder
          monetizationStatus: 'active', // Placeholder
        });
      }

      setUsers(usersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleChangeRole = async (uid: string, currentRole: 'user' | 'admin') => {
    if (user?.uid === uid) {
      toast({
        title: 'Action not allowed',
        description: "You cannot change your own role.",
        variant: 'destructive',
      });
      return;
    }

    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      const userDocRef = doc(db, 'users', uid);
      await updateDoc(userDocRef, { role: newRole });
      toast({
        title: 'Role Updated',
        description: `User role has been changed to ${newRole}.`,
      });
    } catch (error) {
      toast({
        title: 'Error updating role',
        description: 'There was a problem updating the user role.',
        variant: 'destructive',
      });
    }
  };

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
                            <TableCell className="text-green-500">${u.paidEarnings.toFixed(2)}</TableCell>
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
                                        <DropdownMenuItem onClick={() => handleChangeRole(u.uid, u.role)} disabled={user?.uid === u.uid}>
                                            {u.role === 'admin' ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
                                            <span>Change to {u.role === 'admin' ? 'User' : 'Admin'}</span>
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
  );
}

