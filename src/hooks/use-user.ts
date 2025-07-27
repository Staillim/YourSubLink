

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

    setLoading(true);
    let isSubscribed = true;

    // Se unifican los listeners para controlar el estado de carga de forma centralizada.
    const listeners = [
        () => onSnapshot(doc(db, 'users', authUser.uid), async (userDoc) => {
            if (!isSubscribed) return;
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const linksQuery = query(collection(db, 'links'), where('userId', '==', authUser.uid));
                const linksSnapshot = await getDocs(linksQuery);
                const totalGeneratedEarnings = linksSnapshot.docs.reduce((acc, doc) => acc + (doc.data().generatedEarnings || 0), 0);
                
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
        }),
        () => onSnapshot(query(collection(db, "payoutRequests"), where("userId", "==", authUser.uid)), (snapshot) => {
            if (!isSubscribed) return;
            const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayoutRequest));
            setPayouts(requests.sort((a,b) => (b.requestedAt?.seconds ?? 0) - (a.requestedAt?.seconds ?? 0)));
        }),
        () => onSnapshot(query(collection(db, 'cpmHistory'), orderBy('startDate', 'desc')), (snapshot) => {
            if (!isSubscribed) return;
            setCpmHistory(snapshot.docs.map(doc => doc.data() as CpmHistory));
        })
    ];

    const unsubs = listeners.map(listener => listener());

    // Se establece un timeout para evitar un estado de carga infinito si algo falla.
    const loadingTimeout = setTimeout(() => {
        if(isSubscribed) {
            setLoading(false);
        }
    }, 5000); // 5 segundos de espera máxima

    // El estado de carga principal ahora depende del estado de carga del perfil.
    const unsubProfileCheck = onSnapshot(doc(db, 'users', authUser.uid), (doc) => {
      if(doc.exists() && isSubscribed) {
        setLoading(false);
        clearTimeout(loadingTimeout);
      }
    });

    return () => {
      isSubscribed = false;
      unsubs.forEach(unsub => unsub());
      unsubProfileCheck();
      clearTimeout(loadingTimeout);
    };
  }, [authUser, authLoading]);
  
  // Derived state calculations
  const { generatedEarnings, paidEarnings, payoutsPending, availableBalance, globalActiveCpm, hasCustomCpm, activeCpm } = useMemo(() => {
    const genEarnings = userProfile?.generatedEarnings ?? 0;
    const pEarnings = userProfile?.paidEarnings ?? 0;
    
    const pPending = payouts
          .filter(p => p.status === 'pending')
          .reduce((acc, p) => acc + p.amount, 0);

    const availBalance = genEarnings - pEarnings - pPending;

    const globalCpm = cpmHistory.find(c => !c.endDate)?.rate || 0;
    const customCpm = userProfile?.customCpm;
    
    // Lógica corregida para determinar si hay un CPM personalizado activo.
    const hasCustom = typeof customCpm === 'number' && customCpm > 0;
    const actCpm = hasCustom ? customCpm : globalCpm;

    return {
        generatedEarnings: genEarnings,
        paidEarnings: pEarnings,
        payoutsPending: pPending,
        availableBalance: availBalance,
        globalActiveCpm: globalCpm,
        hasCustomCpm: hasCustom,
        activeCpm: actCpm,
    };
  }, [userProfile, payouts, cpmHistory]);
  
  return {
    user: authUser as FirebaseUser | null,
    profile: userProfile,
    role: userProfile?.role,
    loading: loading,
    payouts,
    payoutsPending,
    paidEarnings,
    availableBalance,
    globalActiveCpm,
    hasCustomCpm,
    activeCpm,
  };
}
