
'use client';

import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useUser } from '@/hooks/use-user';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User as UserIcon, Wallet } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { LanguageSwitcher } from './language-switcher';

type PayoutRequest = {
    amount: number;
    status: 'pending' | 'completed' | 'rejected';
}

export function UserNav() {
  const { user, profile, loading } = useUser();
  const router = useRouter();
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);

  useEffect(() => {
    if (user) {
        const q = query(collection(db, "payoutRequests"), where("userId", "==", user.uid), where("status", "==", "pending"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const requests: PayoutRequest[] = [];
            snapshot.forEach(doc => {
                requests.push(doc.data() as PayoutRequest);
            });
            setPayouts(requests);
        });
        return () => unsubscribe();
    }
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const goToProfile = () => {
    router.push('/dashboard/profile');
  };

  if (loading || !user) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-9 w-9" />
      </div>
    )
  }
  
  const payoutsPending = payouts.reduce((acc, p) => acc + p.amount, 0);
  const availableBalance = profile ? profile.generatedEarnings - profile.paidEarnings - payoutsPending : 0;
  const userName = profile?.displayName || user?.displayName || 'User';

  return (
    <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-9 w-9">
                <AvatarImage
                src={user?.photoURL ?? undefined}
                alt={userName}
                />
                <AvatarFallback>{userName?.[0].toUpperCase() ?? 'U'}</AvatarFallback>
            </Avatar>
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                {user?.email}
                </p>
            </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
            <div className="px-2 py-1.5 text-sm flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Wallet className="h-4 w-4" />
                    <span>Balance</span>
                </div>
                <span className="font-semibold">${availableBalance.toFixed(2)}</span>
            </div>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
            <DropdownMenuItem onClick={goToProfile}>
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile</span>
            </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
            </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
    </div>
  );
}
