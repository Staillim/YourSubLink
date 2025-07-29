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

    let profileLoaded = false;
    let payoutsLoaded = false;
    let cpmHistoryLoaded = false;

    const checkLoadingComplete = () => {
        if(profileLoaded && payoutsLoaded && cpmHistoryLoaded && isSubscribed) {
            setLoading(false);
        }
    }

    // Subscribe to User Profile
    const userDocRef = doc(db, 'users', authUser.uid);
    const unsubProfile = onSnapshot(userDocRef, async (userDoc) => {
      if (!isSubscribed) return;

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
    }, (error) => {
      console.error("Error listening to user profile:", error);
      profileLoaded = true;
      checkLoadingComplete();
    });

    // Subscribe to Payouts
    const payoutsQuery = query(
      collection(db, "payoutRequests"),
      where("userId", "==", authUser.uid),
      orderBy('requestedAt', 'desc')
    );
    const unsubPayouts = onSnapshot(payoutsQuery, (snapshot) => {
      if (!isSubscribed) return;
      const requests: PayoutRequest[] = [];
      snapshot.forEach(doc => {
          requests.push({ id: doc.id, ...doc.data() } as PayoutRequest);
      });
      setPayouts(requests);
      payoutsLoaded = true;
      checkLoadingComplete();
    }, (error) => {
      console.error("Error listening to payouts:", error);
      payoutsLoaded = true;
      checkLoadingComplete();
    });
    
    // Subscribe to CPM History
    const cpmQuery = query(collection(db, 'cpmHistory'), orderBy('startDate', 'desc'));
    const unsubCpm = onSnapshot(cpmQuery, (snapshot) => {
        if (!isSubscribed) return;
        const historyData: CpmHistory[] = snapshot.docs.map(doc => doc.data() as CpmHistory);
        setCpmHistory(historyData);
        cpmHistoryLoaded = true;
        checkLoadingComplete();
    }, (error) => {
      console.error("Error listening to CPM history:", error);
      cpmHistoryLoaded = true;
      checkLoadingComplete();
    });

    return () => {
      isSubscribed = false;
      unsubProfile();
      unsubPayouts();
      unsubCpm();
    };
  }, [authUser, authLoading]);
  
  // Memoize derived state for performance and stability
  const { availableBalance, payoutsPending, paidEarnings, activeCpm, globalActiveCpm, hasCustomCpm } = useMemo(() => {
    if (loading || !userProfile) {
        return {
            availableBalance: 0,
            payoutsPending: 0,
            paidEarnings: 0,
            activeCpm: 0,
            globalActiveCpm: 0,
            hasCustomCpm: false,
        };
    }
    
    const genEarnings = userProfile.generatedEarnings ?? 0;
    const pEarnings = userProfile.paidEarnings ?? 0;
    const pendPayouts = payouts
          .filter(p => p.status === 'pending')
          .reduce((acc, p) => acc + p.amount, 0);

    const balance = genEarnings - pEarnings - pendPayouts;

    const globalCpm = cpmHistory.find(c => !c.endDate)?.rate ?? 0;
    const customCpm = userProfile.customCpm;
    const customRateActive = typeof customCpm === 'number' && customCpm > 0;
    const finalActiveCpm = customRateActive ? customCpm : globalCpm;

    return {
        availableBalance: balance,
        payoutsPending: pendPayouts,
        paidEarnings: pEarnings,
        activeCpm: finalActiveCpm,
        globalActiveCpm: globalCpm,
        hasCustomCpm: customRateActive,
    };
  }, [userProfile, payouts, cpmHistory, loading]);

  return {
    user: authUser as FirebaseUser | null,
    profile: userProfile,
    role: userProfile?.role,
    loading: loading,
    payouts,
    availableBalance,
    payoutsPending,
    paidEarnings,
    activeCpm,
    globalActiveCpm,
    hasCustomCpm
  };
}