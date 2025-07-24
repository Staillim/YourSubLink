/**
 * !! ANTES DE EDITAR ESTE ARCHIVO, REVISA LAS DIRECTRICES EN LOS SIGUIENTES DOCUMENTOS: !!
 * - /README.md
 * - /src/AGENTS.md
 * 
 * Este componente maneja la aprobación y rechazo de pagos, una función financiera crítica.
 * Un cambio incorrecto aquí puede resultar en pagos incorrectos o pérdida de fondos.
 */

'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, writeBatch, serverTimestamp, query, orderBy, increment } from 'firebase/firestore';
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
import { MoreVertical, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';

type PayoutRequest = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  method: string;
  details: string;
  status: 'pending' | 'completed' | 'rejected';
  requestedAt: any;
  processedAt?: any;
};

export default function AdminPayoutRequestsPage() {
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'payoutRequests'), orderBy('requestedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestsData: PayoutRequest[] = [];
      snapshot.forEach((doc) => {
        requestsData.push({ id: doc.id, ...doc.data() } as PayoutRequest);
      });
      setRequests(requestsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const handleUpdateRequest = async (requestId: string, newStatus: 'completed' | 'rejected', userId?: string, amount?: number) => {
    setIsSubmitting(requestId);
    try {
        const batch = writeBatch(db);
        const requestRef = doc(db, 'payoutRequests', requestId);
        
        batch.update(requestRef, {
            status: newStatus,
            processedAt: serverTimestamp(),
        });

        if (newStatus === 'completed' && userId && amount) {
            const userRef = doc(db, 'users', userId);
            // Use Firestore's atomic increment to update paidEarnings
            batch.update(userRef, {
                paidEarnings: increment(amount),
            });
        }

        await batch.commit();

        toast({
            title: 'Request Updated',
            description: `The request has been marked as ${newStatus}.`,
        });

    } catch (error) {
        console.error("Error updating request: ", error);
        toast({
            title: 'Error',
            description: 'There was a problem updating the request.',
            variant: 'destructive',
        });
    } finally {
        setIsSubmitting(null);
    }
  }


  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Payout Requests</h1>
        <Card>
          <CardHeader>
             <Skeleton className="h-6 w-48" />
             <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        {[...Array(6)].map((_,i) => <TableHead key={i}><Skeleton className="h-5 w-24" /></TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(5)].map((_, i) => (
                         <TableRow key={i}>
                             {[...Array(5)].map((_,j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
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
      <h1 className="text-2xl font-bold">Payout Requests</h1>
      <Card>
        <CardHeader>
          <CardTitle>Manage Payouts</CardTitle>
          <CardDescription>Review and process all user payout requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>
                    <div className="font-medium">{req.userName}</div>
                    <div className="text-xs text-muted-foreground">{req.userEmail}</div>
                  </TableCell>
                  <TableCell className="font-semibold">${req.amount.toFixed(4)}</TableCell>
                  <TableCell className="capitalize">{req.method}</TableCell>
                  <TableCell>{req.details}</TableCell>
                  <TableCell>{req.requestedAt ? new Date(req.requestedAt.seconds * 1000).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={req.status === 'pending' ? 'secondary' : req.status === 'completed' ? 'default' : 'destructive'}
                        className={req.status === 'completed' ? 'bg-green-600' : ''}>
                        {req.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {isSubmitting === req.id ? (
                        <Loader2 className="h-5 w-5 animate-spin ml-auto" />
                    ) : (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild disabled={req.status !== 'pending'}>
                                <Button variant="ghost" size="icon" disabled={req.status !== 'pending'}>
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleUpdateRequest(req.id, 'completed', req.userId, req.amount)}>
                                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                    <span>Approve</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateRequest(req.id, 'rejected')}>
                                    <XCircle className="mr-2 h-4 w-4 text-red-500" />
                                    <span>Reject</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
               {requests.length === 0 && (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                    No pending payout requests.
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
