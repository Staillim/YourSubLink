

'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile } from 'firebase/auth';
import { auth, db, storage } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/use-user';


export default function ProfilePage() {
  const { user, profile, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && profile) {
      setDisplayName(profile.displayName || user.displayName || '');
    }
  }, [user, profile]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: displayName,
      });

      // Update user document in Firestore
      const userRef = doc(db, 'users', user.uid);
      
      const userData: { [key: string]: any } = {
        displayName: displayName,
      };

      await setDoc(userRef, userData, { merge: true });

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Error updating profile',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
      // Refresh user state by reloading page or using a state manager
      router.refresh();
    }
  };

  if (loading || !user) {
    return (
       <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-32 mb-8" />
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                 <Skeleton className="h-[250px] w-full" />
              </div>
              <div>
                 <Skeleton className="h-[250px] w-full" />
              </div>
           </div>
       </div>
    );
  }

  return (
    <>
      <div className="flex items-center">
        <h1 className="text-xl sm:text-2xl font-semibold">Profile</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-2 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Update your personal details here.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={profile?.photoURL ?? user.photoURL ?? undefined} alt="Profile photo" />
                            <AvatarFallback>{displayName?.[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                            <p className="font-medium">Profile Photo</p>
                            <p className="text-xs text-muted-foreground">Your profile photo is managed by your Google account.</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="displayName">Username</Label>
                        <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={user.email ?? ''} disabled />
                          <p className="text-xs text-muted-foreground">Email address cannot be changed.</p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSaveProfile} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </div>
    </>
  );
}
