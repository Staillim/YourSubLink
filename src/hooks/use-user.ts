

/**
 * !! ANTES DE EDITAR ESTE ARCHIVO, REVISA LAS DIRECTRICES EN LOS SIGUIENTES DOCUMENTOS: !!
 * - /README.md
 * - /src/AGENTS.md
 * 
 * Este hook es fundamental para la gestión del estado del usuario y sus datos de perfil.
 * Un cambio incorrecto aquí puede afectar la autenticación y la visualización de datos en toda la aplicación.
 */

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, createUserProfile } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';

export type UserProfile = {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: 'user' | 'admin';
  linksCount: number;
  generatedEarnings: number;
  paidEarnings: number;
  accountStatus: 'active' | 'suspended';
  customCpm?: number | null;
};

export type PayoutRequest = {
    id: string;
    userId: string;
    userName?: string;
    amount: number;
    method: string;
    details: string;
    status: 'pending' | 'completed' | 'rejected';
    requestedAt: any;
    processedAt?: any;
};

type CpmHistory = {
    rate: number;
    startDate: { seconds: number };
    endDate?: { seconds: number };
};


export function useUser() {
  const [authUser, authLoading] = useAuthState(auth);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [cpmHistory, setCpmHistory] = useState<CpmHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!authUser) {
      setUserProfile(null);
      setPayouts([]);
      setCpmHistory([]);
      setLoading(false);
      return;
    }

    // Keep loading until all data is fetched
    setLoading(true);

    const userDocRef = doc(db, 'users', authUser.uid);
    const unsubProfile = onSnapshot(userDocRef, async (userDoc) => {
      if (!userDoc.exists()) {
        await createUserProfile(authUser);
      } else {
        const userData = userDoc.data();
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
          generatedEarnings: totalGeneratedEarnings,
          paidEarnings: userData.paidEarnings || 0,
          customCpm: userData.customCpm,
          accountStatus: userData.accountStatus || 'active',
          linksCount: linksSnapshot.size,
        });
      }
    });

    const payoutsQuery = query(collection(db, "payoutRequests"), where("userId", "==", authUser.uid), orderBy('requestedAt', 'desc'));
    const unsubPayouts = onSnapshot(payoutsQuery, (snapshot) => {
      const requestsData: PayoutRequest[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayoutRequest));
      setPayouts(requestsData);
    });

    const cpmQuery = query(collection(db, 'cpmHistory'), orderBy('startDate', 'desc'));
    const unsubCpm = onSnapshot(cpmQuery, (snapshot) => {
        setCpmHistory(snapshot.docs.map(doc => doc.data() as CpmHistory));
    });

    // The loading state will be set to false once the profile and cpmHistory are available
    if (userProfile && cpmHistory.length > 0) {
        setLoading(false);
    }
    
    // Fallback to stop loading if auth is done but profile isn't setting for some reason.
    const timer = setTimeout(() => {
        if(loading) {
            setLoading(false);
        }
    }, 5000);


    return () => {
      unsubProfile();
      unsubPayouts();
      unsubCpm();
      clearTimeout(timer);
    };
  }, [authUser, authLoading, userProfile, cpmHistory.length]);
  
  const totalEarnings = userProfile?.generatedEarnings ?? 0;
  const paidEarnings = userProfile?.paidEarnings ?? 0;
  const payoutsPending = payouts
        .filter(p => p.status === 'pending')
        .reduce((acc, p) => acc + p.amount, 0);

  const availableBalance = totalEarnings - paidEarnings - payoutsPending;
  
  const globalActiveCpm = useMemo(() => {
    return cpmHistory.find(c => !c.endDate)?.rate || 0;
  }, [cpmHistory]);
  
  const hasCustomCpm = useMemo(() => {
    return userProfile?.customCpm != null && userProfile.customCpm > 0;
  }, [userProfile?.customCpm]);

  const activeCpm = useMemo(() => {
    return hasCustomCpm ? userProfile?.customCpm! : globalActiveCpm;
  }, [hasCustomCpm, userProfile?.customCpm, globalActiveCpm]);


  return {
    user: authUser as FirebaseUser | null,
    profile: userProfile,
    role: userProfile?.role,
    loading: loading,
    payouts,
    totalEarnings,
    payoutsPending,
    paidEarnings,
    availableBalance,
    activeCpm,
    hasCustomCpm,
    globalActiveCpm
  };
}
