
'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { updateProfile } from 'firebase/auth';
import { auth, db, storage } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setPhotoPreview(user.photoURL);
    }
  }, [user]);

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      let photoURL = user.photoURL;

      // Upload new photo if selected
      if (profilePhoto) {
        const storageRef = ref(storage, `profile-photos/${user.uid}`);
        await uploadBytes(storageRef, profilePhoto);
        photoURL = await getDownloadURL(storageRef);
      }

      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: displayName,
        photoURL: photoURL,
      });

      // Update/Create user document in Firestore
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        displayName: displayName,
        email: user.email,
        photoURL: photoURL,
      }, { merge: true });

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
       <div className="flex min-h-screen w-full flex-col items-center justify-center p-4">
        <div className="w-full max-w-4xl">
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
       </div>
    );
  }

  return (
    <main className="flex min-h-screen w-full flex-col items-center bg-muted/40 p-4">
      <div className="w-full max-w-4xl">
        <Button variant="ghost" onClick={() => router.push('/dashboard')} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
        </Button>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Profile Information</CardTitle>
                        <CardDescription>Update your personal details here.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                            <Avatar className="h-20 w-20">
                                <AvatarImage src={photoPreview ?? undefined} alt="Profile photo" />
                                <AvatarFallback>{displayName?.[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="space-y-1 w-full">
                                 <Label htmlFor="profile-photo">Profile Photo</Label>
                                 <Input id="profile-photo" type="file" accept="image/*" onChange={handlePhotoChange} className="max-w-xs" />
                                 <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB.</p>
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

            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Your Stats</CardTitle>
                        <CardDescription>An overview of your account activity.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                            <span className="font-medium">Current Balance</span>
                            <span className="font-bold text-lg text-primary">$0.00</span>
                        </div>
                         <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                            <span className="font-medium">Account Status</span>
                            <span className="font-semibold text-green-600">Verified</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                            <span className="font-medium">Total Visits</span>
                            <span>0</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                            <span className="font-medium">Monetized Visits</span>
                            <span>0</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                            <span className="font-medium">Current CPM</span>
                            <span>$3.00</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </main>
  );
}
