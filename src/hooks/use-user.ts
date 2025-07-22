
'use client';

import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';

type UserProfile = {
  displayName: string;
  email: string;
  photoURL: string;
  role: 'user' | 'admin';
};

export function useUser() {
  const [authUser, authLoading] = useAuthState(auth);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!authUser) {
      setUserProfile(null);
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, 'users', authUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        setUserProfile(doc.data() as UserProfile);
      } else {
        // User exists in Auth but not in Firestore.
        // This can happen if they haven't visited their profile page yet.
        // We can create a default profile here or handle it as needed.
        // For now, we'll assume a 'user' role.
        setUserProfile({
            displayName: authUser.displayName || 'User',
            email: authUser.email || '',
            photoURL: authUser.photoURL || '',
            role: 'user',
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [authUser, authLoading]);

  return {
    user: authUser as FirebaseUser | null,
    profile: userProfile,
    role: userProfile?.role,
    loading: loading,
  };
}
