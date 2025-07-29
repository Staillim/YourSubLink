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
import { MoreVertical, CheckCircle, XCircle, Loader2, Calendar, CreditCard } from 'lucide-react';
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

        // DOCUMENTACIÓN DE LÓGICA CRÍTICA (2024-05-22):
        // Al completar un pago, registramos el monto en 'paidEarnings' del usuario.
        // Esto disminuye el balance disponible (Generated - Paid).
        // Usamos increment() para una operación atómica segura.
        if (newStatus === 'completed' && userId && amount) {
            const userRef = doc(db, 'users', userId);
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
                <TableHead className="hidden sm:table-cell">Amount</TableHead>
                <TableHead className="hidden md:table-cell">Method</TableHead>
                <TableHead className="hidden lg:table-cell">Details</TableHead>
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
                      {/* Mobile-only details */}
                      <div className="sm:hidden mt-2 space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                              <span className="font-medium">Amount:</span>
                              <span className="font-semibold">${req.amount.toFixed(4)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <span className="font-medium">Method:</span>
                              <span className="capitalize text-muted-foreground">{req.method}</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <span className="font-medium">Date:</span>
                              <span className="text-muted-foreground">
                                  {req.requestedAt ? new Date(req.requestedAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                              </span>
                          </div>
                      </div>
                  </TableCell>
                  <TableCell className="font-semibold hidden sm:table-cell">${req.amount.toFixed(4)}</TableCell>
                  <TableCell className="capitalize hidden md:table-cell">{req.method}</TableCell>
                  <TableCell className="hidden lg:table-cell">{req.details}</TableCell>
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
                    <TableCell colSpan={6} className="h-24 text-center">
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
