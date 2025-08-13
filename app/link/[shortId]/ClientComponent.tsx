
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
import { collection, query, where, getDocs, doc, writeBatch, increment, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';

export default function ClientComponent({ shortId }: { shortId: string }) {
  // Inyectar los scripts exactamente como los proporcionó el usuario, sin id, sin div, justo después del <head>
  if (typeof window !== 'undefined') {
    const adsScripts = `\n<script src="https://upskittyan.com/act/files/tag.min.js?z=9688577" data-cfasync="false" async></script>\n<script>(function(d,z,s){s.src='https://'+d+'/400/'+z;try{(document.body||document.documentElement).appendChild(s)}catch(e){}})('vemtoutcheeg.com',9688580,document.createElement('script'))</script>\n<script>(function(d,z,s){s.src='https://'+d+'/401/'+z;try{(document.body||document.documentElement).appendChild(s)}catch(e){}})('groleegni.net',9688582,document.createElement('script'))</script>\n<script>(function(d,z,s){s.src='https://'+d+'/401/'+z;try{(document.body||document.documentElement).appendChild(s)}catch(e){}})('gizokraijaw.net',9688583,document.createElement('script'))</script>\n`;
    if (!document.head.hasAttribute('data-ads-injected')) {
      document.head.insertAdjacentHTML('afterbegin', adsScripts);
      document.head.setAttribute('data-ads-injected', 'true');
    }
  }
  const [status, setStatus] = useState<'loading' | 'gate' | 'redirecting' | 'not-found' | 'invalid'>('loading');
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [gateStartTime, setGateStartTime] = useState<number | null>(null);
  // IP cache para evitar múltiples requests
  const [visitorIP, setVisitorIP] = useState<string | null>(null);

  // Helper para obtener la IP del visitante
  async function fetchVisitorIP() {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      return data.ip;
    } catch {
      return null;
    }
  }

  // Helpers para cookies
  function getCookie(name: string) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  }
  function setCookie(name: string, value: string, days: number) {
    let expires = '';
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days*24*60*60*1000));
      expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + value + expires + '; path=/';
  }
  useEffect(() => {
    if (!shortId) {
      setStatus('not-found');
      return;
    }

    const processLinkVisit = async () => {
      // Obtener IP del visitante
      let ip = visitorIP;
      if (!ip) {
        ip = await fetchVisitorIP();
        setVisitorIP(ip);
      }

      const linksRef = collection(db, 'links');
      const q = query(linksRef, where('shortId', '==', shortId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setStatus('not-found');
        return;
      }

      const linkDoc = querySnapshot.docs[0];
      const data = linkDoc.data() as Omit<LinkData, 'id'>;
      const link: LinkData = { id: linkDoc.id, ...data };
      setLinkData(link);

      // --- VALIDACIÓN GLOBAL DE VISTA MONETIZADA ---
      const cookieName = 'last_visit_global';
      const now = Date.now();
      const cookieLastVisit = Number(getCookie(cookieName)) || 0;
      let dbLastVisit = 0;
      if (ip) {
        const visitRef = doc(db, 'global_visits', ip);
        const visitSnap = await getDoc(visitRef);
        dbLastVisit = visitSnap.exists() ? Number(visitSnap.data().last_visit) : 0;
      }
      const lastVisit = Math.max(cookieLastVisit, dbLastVisit);
      const canMonetize = !lastVisit || (now - lastVisit) >= 1800_000;

      // Guardar en el estado para usar en el registro del click
      (window as any)._canMonetize = canMonetize;
      (window as any)._visitorIP = ip;

      const hasRules = link.rules && link.rules.length > 0;
      if (hasRules) {
        setGateStartTime(Date.now());
        setStatus('gate');
      } else {
        setStatus('redirecting');
        await handleAllStepsCompleted(link);
      }
    };

    processLinkVisit().catch(err => {
      console.error("Error processing link visit:", err);
      setStatus('not-found');
    });
  }, [shortId, visitorIP]);
  
  const handleAllStepsCompleted = async (finalLinkData?: LinkData) => {
    const dataToUse = finalLinkData || linkData;
    if (!dataToUse) return;

    // Security check: Interaction Speed
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
    const canMonetize = (window as any)._canMonetize ?? true;
    const ip = (window as any)._visitorIP ?? null;
    const cookieName = 'last_visit_global';
    const now = Date.now();
    // Obtener lastVisit para el motivo si no se monetiza
    let lastVisit = 0;
    if (typeof window !== 'undefined') {
      const cookieLastVisit = Number(getCookie(cookieName)) || 0;
      let dbLastVisit = 0;
      if (ip) {
        const visitRef = doc(db, 'global_visits', ip);
        const visitSnap = await getDoc(visitRef);
        dbLastVisit = visitSnap.exists() ? Number(visitSnap.data().last_visit) : 0;
      }
      lastVisit = Math.max(cookieLastVisit, dbLastVisit);
    }

    try {
      const linkRef = doc(db, 'links', dataToUse.id);
      const batch = writeBatch(db);

      let cpmUsed = 0;
      let earningsGenerated = 0;
      let monetized = false;
      let reason = '';

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
          const cpmQuery = query(collection(db, 'cpmHistory'), where('endDate', '==', null));
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
        reason = '';
        // Actualizar cookie y Firestore
        setCookie(cookieName, String(now), 30);
        if (ip) {
          const visitRef = doc(db, 'global_visits', ip);
          await setDoc(visitRef, { last_visit: now }, { merge: true });
        }
      } else {
        monetized = false;
        reason = lastVisit && (now - lastVisit) < 1800_000 ? 'visit within 30min window' : 'not monetizable';
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


  if (status === 'not-found') {
    return notFound();
  }

  if (status === 'loading' || status === 'redirecting') {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  // Render the gate, passing the handleAllStepsCompleted function to be called on button click.
  if (status === 'gate' && linkData) {
    return <LinkGate linkData={linkData} onAllStepsCompleted={() => handleAllStepsCompleted()} />;
  }
  
  // Fallback loading state
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground p-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-lg text-muted-foreground">Please wait...</p>
    </div>
  );
}
