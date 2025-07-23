
'use client';

import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, createUserProfile } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';

export type UserProfile = {
  displayName: string;
  email: string;
  photoURL: string;
  role: 'user' | 'admin';
  generatedEarnings: number;
  paidEarnings: number;
};

export type PayoutRequest = {
    id: string;
    userId: string;
    amount: number;
    method: string;
    details: string;
    status: 'pending' | 'completed' | 'rejected';
    requestedAt: any;
    processedAt?: any;
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

    // This is the ideal place to ensure the user profile exists.
    const userDocRef = doc(db, 'users', authUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setUserProfile({
            displayName: data.displayName || 'User',
            email: data.email || '',
            photoURL: data.photoURL || '',
            role: data.role || 'user',
            generatedEarnings: data.generatedEarnings || 0,
            paidEarnings: data.paidEarnings || 0,
        });
      } else {
        // User is authenticated, but no profile exists. Create it now.
        createUserProfile(authUser);
        // The onSnapshot listener will automatically pick up the new profile
        // and update the state, so we don't need to set it here.
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
