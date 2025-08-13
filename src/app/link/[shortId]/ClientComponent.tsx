
/**
 * !! ANTES DE EDITAR ESTE ARCHIVO, REVISA LAS DIRECTRICES EN LOS SIGUIENTES DOCUMENTOS: !!
 * - /README.md
 * - /src/AGENTS.md
 * 
 * Este componente maneja la lógica más crítica de la aplicación: el conteo de visitas y la redirección.
 * Un cambio incorrecto aquí puede romper la monetización y el registro de clics.
 */

'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import LinkGate from '@/components/link-gate'; 
import type { LinkData } from '@/types'; 
import { db } from '@/lib/firebase';
import { collection, doc, writeBatch, serverTimestamp, getDoc, query, where, getDocs, increment, limit, setDoc } from 'firebase/firestore';
import type { Rule } from '@/components/rule-editor';

export default function ClientComponent({ shortId, linkId }: { shortId: string, linkId: string }) {
  // Helpers para cookies
  function getCookie(name: string) {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  }
  function setCookie(name: string, value: string, days: number) {
    if (typeof document === 'undefined') return;
    let expires = '';
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days*24*60*60*1000));
      expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + value + expires + '; path=/';
  }

  // Helper para obtener la IP pública
  // Puedes cambiar esta función para usar un endpoint propio, ej: /api/get-ip
  async function fetchVisitorIP() {
    try {
      // Reemplaza la URL por tu backend si lo implementas
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      return data.ip;
    } catch {
      return null;
    }
  }
  const [status, setStatus] = useState<'loading' | 'gate' | 'redirecting' | 'not-found' | 'invalid'>('loading');
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [gateStartTime, setGateStartTime] = useState<number | null>(null);
  const [finalRules, setFinalRules] = useState<Rule[]>([]);

  useEffect(() => {
    if (!linkId) {
      setStatus('not-found');
      return;
    }

    const processLinkVisit = async () => {
        const linkRef = doc(db, 'links', linkId);
        const linkDoc = await getDoc(linkRef);

        if (!linkDoc.exists()) {
            setStatus('not-found');
            return;
        }

        const data = linkDoc.data() as Omit<LinkData, 'id'>;
        const currentLink: LinkData = { id: linkDoc.id, ...data };

        const userRef = doc(db, 'users', currentLink.userId);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists() || userSnap.data()?.accountStatus === 'suspended' || currentLink.monetizationStatus === 'suspended') {
            // Redirect without counting if user or link is suspended
            window.location.href = currentLink.original;
            setStatus('invalid'); // Set status but redirect immediately
            return;
        }
        
        setLinkData(currentLink);

        // Fetch global rules
        const globalRulesQuery = query(collection(db, 'globalRules'), where('status', '==', 'active'));
        const globalRulesSnapshot = await getDocs(globalRulesQuery);
        const globalRules = globalRulesSnapshot.docs.map(doc => {
            const ruleData = doc.data();
            return { type: ruleData.type, url: ruleData.url };
        }).filter(rule => rule.type && rule.url); // Ensure valid rule structure

        // Merge user rules and applicable global rules
        const mergedRules = [...(currentLink.rules || []), ...globalRules];
        setFinalRules(mergedRules);

        if (mergedRules.length > 0) {
            setGateStartTime(Date.now());
            setStatus('gate');
        } else {
            setStatus('redirecting');
            await handleAllStepsCompleted(currentLink);
        }
    };

    processLinkVisit().catch(err => {
        console.error("Error processing link visit:", err);
        setStatus('not-found');
    });
  }, [linkId]);
  
  const handleAllStepsCompleted = async (finalLinkData?: LinkData) => {
    const dataToUse = finalLinkData || linkData;
    if (!dataToUse) return;

    if (gateStartTime) {
      const completionTime = Date.now();
      const durationInSeconds = (completionTime - gateStartTime) / 1000;
      if (durationInSeconds < 10) {
        console.warn(`Invalid click detected: completed too fast (${durationInSeconds}s). Redirecting without counting.`);
        window.location.href = dataToUse.original;
        return;
      }
    }

    setStatus('redirecting');

    // --- VALIDACIÓN GLOBAL DE VISTA MONETIZADA ---
    const cookieName = 'last_visit_global';
    const now = Date.now();
    let ip = '';
    let canMonetize = true;
    let lastVisit = 0;
    let reason = '';

    try {
      ip = await fetchVisitorIP();
      const cookieLastVisit = Number(getCookie(cookieName)) || 0;
      let dbLastVisit = 0;
      let fallbackReason = '';
      if (ip) {
        // Si hay IP, usar validación global normal
        const visitRef = doc(db, 'global_visits', ip);
        const visitSnap = await getDoc(visitRef);
        dbLastVisit = visitSnap.exists() ? Number(visitSnap.data().last_visit) : 0;
        lastVisit = Math.max(cookieLastVisit, dbLastVisit);
        canMonetize = !lastVisit || (now - lastVisit) >= 1800_000;
        fallbackReason = '';
      } else {
        // Si no hay IP, fallback a solo cookie
        lastVisit = cookieLastVisit;
        canMonetize = !lastVisit || (now - lastVisit) >= 1800_000;
        fallbackReason = 'ip_unavailable';
      }

      const linkRef = doc(db, 'links', dataToUse.id);
      const batch = writeBatch(db);

      let cpmUsed = 0;
      let earningsGenerated = 0;
      let monetized = false;

      // 1. Incrementar el contador de clicks siempre
      batch.update(linkRef, { clicks: increment(1) });

      // 2. Si se puede monetizar, calcular ingresos y actualizar cookie + Firestore
      if (canMonetize && dataToUse.monetizable && dataToUse.monetizationStatus !== 'suspended') {
        // CPM personalizado o global
        const userRef = doc(db, 'users', dataToUse.userId);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();
        const customCpm = userData?.customCpm;
        if (customCpm && customCpm > 0) {
          cpmUsed = customCpm;
        } else {
          const cpmQuery = query(collection(db, 'cpmHistory'), where('endDate', '==', null), limit(1));
          const cpmSnapshot = await getDocs(cpmQuery);
          let activeCpm = 3.00;
          if (!cpmSnapshot.empty) {
            activeCpm = cpmSnapshot.docs[0].data().rate;
          }
          cpmUsed = activeCpm;
        }
        earningsGenerated = cpmUsed / 1000;
        batch.update(linkRef, { generatedEarnings: increment(earningsGenerated) });
        monetized = true;
        reason = fallbackReason;
        // Actualizar cookie y Firestore
        setCookie(cookieName, String(now), 30);
        if (ip) {
          const visitRef = doc(db, 'global_visits', ip);
          await setDoc(visitRef, { last_visit: now }, { merge: true });
        }
      } else {
        monetized = false;
        reason = fallbackReason || (lastVisit && (now - lastVisit) < 1800_000 ? 'visit within 30min window' : 'not monetizable');
      }

      // 3. Registrar el click con toda la info
      const clickLogRef = doc(collection(db, 'clicks'));
      batch.set(clickLogRef, {
        linkId: dataToUse.id,
        userId: dataToUse.userId,
        ip: ip || '',
        timestamp: serverTimestamp(),
        cpmUsed,
        earningsGenerated,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        monetized,
        reason,
      });

      await batch.commit();

    } catch(error) {
      console.error("Failed to count click:", error);
    } finally {
      window.location.href = dataToUse.original;
    }
  }

  if (status === 'invalid') {
    // A redirect is triggered in useEffect, but we can show a message as a fallback.
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground p-4">
            <h1 className="text-2xl font-bold">Link Not Available</h1>
            <p className="mt-2 text-muted-foreground">This link has been disabled.</p>
        </div>
    )
  }

  if (status === 'not-found') {
    return notFound();
  }

  if (status === 'loading' || status === 'redirecting' || !linkData) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  if (status === 'gate') {
    const gateLinkData = { ...linkData, rules: finalRules };
    return <LinkGate linkData={gateLinkData} onAllStepsCompleted={() => handleAllStepsCompleted()} />;
  }
  
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground p-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-lg text-muted-foreground">Please wait...</p>
    </div>
  );
}
