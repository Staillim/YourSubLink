

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
      setLoading(false);
      return;
    }

    // Keep loading until all data sources have been fetched for the first time.
    setLoading(true);

    let profileLoaded = false;
    let payoutsLoaded = false;
    let cpmLoaded = false;

    const checkLoadingComplete = () => {
        if (profileLoaded && payoutsLoaded && cpmLoaded) {
            setLoading(false);
        }
    };

    const userDocRef = doc(db, 'users', authUser.uid);
    const unsubProfile = onSnapshot(userDocRef, async (userDoc) => {
        if (userDoc.exists()) {
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
        } else {
            await createUserProfile(authUser);
        }
        profileLoaded = true;
        checkLoadingComplete();
    });

    const payoutsQuery = query(collection(db, "payoutRequests"), where("userId", "==", authUser.uid));
    const unsubPayouts = onSnapshot(payoutsQuery, (snapshot) => {
      const requests: PayoutRequest[] = [];
      snapshot.forEach(doc => {
          requests.push({ id: doc.id, ...doc.data() } as PayoutRequest);
      });
      setPayouts(requests.sort((a,b) => (b.requestedAt?.seconds ?? 0) - (a.requestedAt?.seconds ?? 0)));
      payoutsLoaded = true;
      checkLoadingComplete();
    });
    
    const cpmQuery = query(collection(db, 'cpmHistory'), orderBy('startDate', 'desc'));
    const unsubCpm = onSnapshot(cpmQuery, (snapshot) => {
        const historyData: CpmHistory[] = snapshot.docs.map(doc => doc.data() as CpmHistory);
        setCpmHistory(historyData);
        cpmLoaded = true;
        checkLoadingComplete();
    });


    return () => {
      unsubProfile();
      unsubPayouts();
      unsubCpm();
    };
  }, [authUser, authLoading]);
  
  // Derived state for balance calculation
  const totalEarnings = userProfile?.generatedEarnings ?? 0;
  const paidEarnings = userProfile?.paidEarnings ?? 0;
  const payoutsPending = payouts
        .filter(p => p.status === 'pending')
        .reduce((acc, p) => acc + p.amount, 0);

  const availableBalance = totalEarnings - paidEarnings - payoutsPending;
  
  const finalProfile: UserProfile | null = userProfile ? {
      ...userProfile,
      // Treat customCpm of 0 as null so the UI can correctly show global CPM
      customCpm: userProfile.customCpm === 0 ? null : userProfile.customCpm,
  } : null;

  const globalActiveCpm = cpmHistory.find(c => !c.endDate)?.rate || 0;
  const activeCpm = finalProfile?.customCpm != null ? finalProfile.customCpm : globalActiveCpm;
  const hasCustomCpm = finalProfile?.customCpm != null;

  return {
    user: authUser as FirebaseUser | null,
    profile: finalProfile,
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
