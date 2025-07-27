

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
import { doc, onSnapshot, collection, query, where, getDocs, orderBy, getDoc } from 'firebase/firestore';
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
  const [earningsFromGlobalCpm, setEarningsFromGlobalCpm] = useState(0);
  const [earningsFromCustomCpm, setEarningsFromCustomCpm] = useState(0);
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

    setLoading(true);

    const unsubProfile = onSnapshot(doc(db, 'users', authUser.uid), async (userDoc) => {
        let profileData;
        if (userDoc.exists()) {
            profileData = userDoc.data();
        } else {
            await createUserProfile(authUser);
            const newUserDoc = await getDoc(doc(db, 'users', authUser.uid));
            profileData = newUserDoc.data();
        }

        if (profileData) {
            const linksQuery = query(collection(db, 'links'), where('userId', '==', authUser.uid));
            const linksSnapshot = await getDocs(linksQuery);
            const totalGeneratedEarnings = linksSnapshot.docs.reduce((acc, doc) => acc + (doc.data().generatedEarnings || 0), 0);
            
            setUserProfile({
                uid: authUser.uid,
                displayName: profileData.displayName || 'User',
                email: profileData.email || '',
                photoURL: profileData.photoURL || '',
                role: profileData.role || 'user',
                generatedEarnings: totalGeneratedEarnings,
                paidEarnings: profileData.paidEarnings || 0,
                customCpm: profileData.customCpm,
                accountStatus: profileData.accountStatus || 'active',
                linksCount: linksSnapshot.size,
            });
        }
    });

    const unsubPayouts = onSnapshot(query(collection(db, "payoutRequests"), where("userId", "==", authUser.uid), orderBy("requestedAt", "desc")), (snapshot) => {
      setPayouts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayoutRequest)));
    });

    const unsubCpm = onSnapshot(query(collection(db, 'cpmHistory'), orderBy('startDate', 'desc')), (snapshot) => {
        setCpmHistory(snapshot.docs.map(doc => doc.data() as CpmHistory));
    });

    return () => {
      unsubProfile();
      unsubPayouts();
      unsubCpm();
    };
  }, [authUser, authLoading]);
  
  // This effect will run when the dependencies change, ensuring loading is false only when all data is present.
  useEffect(() => {
    if (!authLoading && authUser && userProfile !== null && cpmHistory.length > 0) {
        // Calculate earnings breakdown once all data is available
        const calculateEarningsBreakdown = async () => {
            const clicksQuery = query(collection(db, 'clicks'), where('userId', '==', authUser.uid), where('processed', '==', true));
            const clicksSnapshot = await getDocs(clicksQuery);
            
            let globalEarnings = 0;
            let customEarnings = 0;
    
            const globalRate = cpmHistory.find(c => !c.endDate)?.rate || 0;
            const customRate = userProfile?.customCpm;

            clicksSnapshot.forEach(doc => {
                const clickData = doc.data();
                const earningsForClick = clickData.earningsGenerated || 0;
                
                // If a custom rate exists, any non-global rate click is custom.
                // Otherwise, all earnings are global.
                if (customRate && clickData.cpmUsed === customRate) {
                   customEarnings += earningsForClick;
                } else {
                   globalEarnings += earningsForClick;
                }
            });
    
            setEarningsFromGlobalCpm(globalEarnings);
            setEarningsFromCustomCpm(customEarnings);
            setLoading(false); // All data is loaded and calculated
        };

        calculateEarningsBreakdown();
    } else if (!authLoading && !authUser) {
        setLoading(false);
    }
  }, [authUser, authLoading, userProfile, cpmHistory]);

  const totalEarnings = userProfile?.generatedEarnings ?? 0;
  const paidEarnings = userProfile?.paidEarnings ?? 0;
  const payoutsPending = payouts.filter(p => p.status === 'pending').reduce((acc, p) => acc + p.amount, 0);
  const availableBalance = totalEarnings - paidEarnings - payoutsPending;
  
  const finalProfile: UserProfile | null = userProfile ? {
      ...userProfile,
      customCpm: userProfile.customCpm === 0 ? null : userProfile.customCpm,
  } : null;

  const globalActiveCpm = cpmHistory.find(c => !c.endDate)?.rate || 0;
  const hasCustomCpm = finalProfile?.customCpm != null && finalProfile.customCpm > 0;
  const activeCpm = hasCustomCpm ? finalProfile.customCpm! : globalActiveCpm;

  return {
    user: authUser as FirebaseUser | null,
    profile: finalProfile,
    role: userProfile?.role,
    loading,
    payouts,
    totalEarnings,
    payoutsPending,
    paidEarnings,
    availableBalance,
    activeCpm,
    hasCustomCpm,
    globalActiveCpm,
    earningsFromGlobalCpm,
    earningsFromCustomCpm,
  };
}
