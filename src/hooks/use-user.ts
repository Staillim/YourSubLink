
'use client';

import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, createUserProfile } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';

export type UserProfile = {
  uid: string;
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
    
    const unsubscribe = onSnapshot(userDocRef, async (userDoc) => {
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Fetch all links for this user to calculate total earnings dynamically
        const linksQuery = query(collection(db, 'links'), where('userId', '==', authUser.uid));
        const linksSnapshot = await getDocs(linksQuery);
        const totalGeneratedEarnings = linksSnapshot.docs.reduce((acc, doc) => {
            return acc + (doc.data().generatedEarnings || 0);
        }, 0);

        setUserProfile({
            uid: authUser.uid,
            displayName: userData.displayName || 'User',
            email: userData.email || '',
            photoURL: userData.photoURL || '',
            role: userData.role || 'user',
            generatedEarnings: totalGeneratedEarnings, // Use calculated value
            paidEarnings: userData.paidEarnings || 0,
        });
      } else {
        // User is authenticated, but no profile exists. Create it now.
        await createUserProfile(authUser);
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
