
'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { Loader2, ExternalLink, CheckCircle2, Lock, Link as LinkIcon, ChevronRight, Youtube, Instagram } from 'lucide-react';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp, increment, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Rule } from '@/components/rule-editor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

type LinkData = {
  id: string;
  original: string;
  rules: Rule[];
  monetizable: boolean;
  userId: string;
  realClicks: number;
  title: string;
};

const RULE_DETAILS = {
  like: { text: 'Like & Comment on Video', icon: Youtube, color: 'bg-red-600 hover:bg-red-700' },
  subscribe: { text: 'Subscribe On Youtube', icon: Youtube, color: 'bg-red-600 hover:bg-red-700' },
  follow: { text: 'Follow On Instagram', icon: Instagram, color: 'bg-blue-600 hover:bg-blue-700' },
  visit: { text: 'Visit Website', icon: ExternalLink, color: 'bg-gray-500 hover:bg-gray-600' },
};


function RuleItem({ rule, onComplete, isCompleted }: { rule: Rule; onComplete: () => void; isCompleted: boolean }) {
  const [isClicked, setIsClicked] = useState(false);
  const [verifyingText, setVerifyingText] = useState('Verificando');

  const { text, icon: Icon, color } = RULE_DETAILS[rule.type] || RULE_DETAILS.visit;

  const handleClick = () => {
    if (isCompleted || isClicked) return;

    window.open(rule.url, '_blank');
    setIsClicked(true);
    
    let dots = 0;
    const verifyingInterval = setInterval(() => {
        dots = (dots + 1) % 4;
        setVerifyingText(`Verificando${'.'.repeat(dots)}`);
    }, 500);

    // Instead of a timeout, you could implement a more robust verification system
    // (e.g., using a backend check), but for now, we'll keep the timeout.
    const completionTimeout = setTimeout(() => {
      clearInterval(verifyingInterval);
      onComplete();
    }, 10000);
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isClicked}
      className={`w-full justify-between h-auto py-4 px-5 text-base font-semibold ${isCompleted ? 'bg-green-600 hover:bg-green-700' : color}`}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-6 w-6" />
        <span>{text}</span>
      </div>
      <div>
        {isClicked && !isCompleted && (
           <span className="text-sm font-mono bg-black/20 rounded-md px-2 py-1 w-28 text-center">{verifyingText}</span>
        )}
        {isCompleted && (
            <CheckCircle2 className="h-6 w-6" />
        )}
        {!isClicked && !isCompleted && (
            <ChevronRight className="h-6 w-6" />
        )}
      </div>
    </Button>
  );
}


function LinkGate({ linkData }: { linkData: LinkData }) {
    const [completedRules, setCompletedRules] = useState<boolean[]>(Array(linkData.rules.length).fill(false));
    const [isRedirecting, setIsRedirecting] = useState(false);
    
    const totalRules = linkData.rules.length;
    const completedCount = completedRules.filter(Boolean).length;
    const allRulesCompleted = completedCount === totalRules;

    const handleRuleComplete = (index: number) => {
        setCompletedRules(prev => {
            const newCompleted = [...prev];
            newCompleted[index] = true;
            return newCompleted;
        });
    }

    const handleUnlockClick = () => {
        setIsRedirecting(true);
        window.location.href = linkData.original;
    }
    
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md shadow-2xl bg-card border-gray-800">
                <CardHeader className="text-center items-center pt-8">
                    <CardTitle className="text-3xl font-bold tracking-tight">Unlock Link</CardTitle>
                    <CardDescription className="text-muted-foreground text-base pt-1">
                        Complete the actions and unlock the link
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 px-6 pb-8 pt-4">
                    <div className="space-y-3">
                        {linkData.rules.map((rule, index) => (
                            <RuleItem 
                                key={index} 
                                rule={rule} 
                                onComplete={() => handleRuleComplete(index)}
                                isCompleted={completedRules[index]} 
                            />
                        ))}
                    </div>

                    <div className="pt-4 space-y-2">
                         <p className="text-center text-sm font-medium text-muted-foreground">
                            unlock progress {completedCount}/{totalRules}
                        </p>
                        <Progress value={(completedCount / totalRules) * 100} className="w-full h-2 bg-gray-700 [&>div]:bg-green-500" />
                    </div>

                    <Button
                        onClick={handleUnlockClick}
                        disabled={!allRulesCompleted || isRedirecting}
                        className="w-full font-bold text-lg py-7 mt-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-800 disabled:text-muted-foreground disabled:cursor-not-allowed"
                        size="lg"
                    >
                        <div className="flex items-center justify-between w-full">
                           <Lock className="h-5 w-5"/>
                           {isRedirecting ? <span>Redirecting...</span> : <span>Unlock Link</span>}
                           {isRedirecting ? <Loader2 className="h-5 w-5 animate-spin"/> : <LinkIcon className="h-5 w-5"/>}
                        </div>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}


export default function ClientComponent({ shortId }: { shortId: string }) {
  const [status, setStatus] = useState<'loading' | 'gate' | 'redirecting' | 'not-found'>('loading');
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  
  useEffect(() => {
    if (!shortId) {
        setStatus('not-found');
        return;
    };
    
    const recordClick = async (linkId: string, linkData: Omit<LinkData, 'id'>) => {
        try {
            const ipAddress = 'x.x.x.x'; // Fake IP for client-side logic
            const batch = writeBatch(db);
            
            // --- Real Click Logic (Client-Side) ---
            let isRealClick = false;
            const visitorKey = `visitor_${linkId}`;
            const lastVisit = localStorage.getItem(visitorKey);
            const oneHour = 60 * 60 * 1000;

            if (!lastVisit || (Date.now() - parseInt(lastVisit)) > oneHour) {
                isRealClick = true;
                localStorage.setItem(visitorKey, Date.now().toString());
            }

            // 1. Always create a historical click record.
            const clickDocRef = doc(collection(db, 'clicks'));
            batch.set(clickDocRef, {
                linkId: linkId,
                timestamp: serverTimestamp(),
                ipAddress: ipAddress,
                userAgent: navigator.userAgent,
                isRealClick: isRealClick,
            });

            // 2. Prepare increments for the link document
            const linkCounters: { [key: string]: any } = {
                clicks: increment(1)
            };
            
            if (isRealClick) {
                linkCounters.realClicks = increment(1);
            
                if (linkData.monetizable) {
                    const cpmQuery = query(collection(db, 'cpmHistory'), where('endDate', '==', null));
                    const cpmSnap = await getDocs(cpmQuery);
                    const activeCpm = cpmSnap.empty ? 3.00 : cpmSnap.docs[0].data().rate;
                    const earningsPerClick = activeCpm / 1000;
                    
                    linkCounters.generatedEarnings = increment(earningsPerClick);

                    if (linkData.userId) {
                        const userRef = doc(db, 'users', linkData.userId);
                        batch.update(userRef, {
                            generatedEarnings: increment(earningsPerClick)
                        });
                    }

                    if (!cpmSnap.empty) {
                        const cpmId = cpmSnap.docs[0].id;
                        const earningsByCpmField = `earningsByCpm.${cpmId}`;
                        linkCounters[earningsByCpmField] = increment(earningsPerClick);
                    }
                }

                // Handle milestone notifications
                const currentRealClicks = linkData.realClicks || 0;
                const newRealClicks = currentRealClicks + 1;
                const milestone = 1000;
                if (Math.floor(currentRealClicks / milestone) < Math.floor(newRealClicks / milestone)) {
                    const reachedMilestone = Math.floor(newRealClicks / milestone) * milestone;
                    const notificationRef = doc(collection(db, 'notifications'));
                    batch.set(notificationRef, {
                        userId: linkData.userId,
                        linkId: linkId,
                        linkTitle: linkData.title,
                        type: 'milestone',
                        milestone: reachedMilestone,
                        message: `Your link "${linkData.title}" reached ${reachedMilestone.toLocaleString()} real visits!`,
                        createdAt: serverTimestamp(),
                        read: false
                    });
                }
            }

            // 3. Apply all counter updates to the link document
            const linkRef = doc(db, 'links', linkId);
            batch.update(linkRef, linkCounters);

            // Commit all batched writes to Firestore
            await batch.commit();

        } catch (error) {
            console.error("Error recording click:", error);
        }
    }


    const processLinkVisit = async () => {
      const q = query(collection(db, 'links'), where('shortId', '==', shortId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setStatus('not-found');
        return;
      }
      
      const linkDoc = querySnapshot.docs[0];
      const data = linkDoc.data();
      const linkId = linkDoc.id;

      const currentLinkData: LinkData = {
          id: linkId,
          original: data.original,
          rules: data.rules || [],
          monetizable: data.monetizable || false,
          userId: data.userId,
          realClicks: data.realClicks || 0,
          title: data.title,
      };
      
      // Record the click asynchronously
      recordClick(linkId, currentLinkData);

      if (currentLinkData.rules && currentLinkData.rules.length > 0) {
        setLinkData(currentLinkData);
        setStatus('gate');
      } else {
        setStatus('redirecting');
        window.location.href = currentLinkData.original;
      }
    };

    processLinkVisit();
  }, [shortId]);
  
  if (status === 'not-found') {
      notFound();
  }
  
  if (status === 'gate' && linkData) {
      return <LinkGate linkData={linkData} />;
  }

  // Loading, redirecting, or fallback state
  return (
     <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary"/>
        <p className="mt-4 text-lg text-muted-foreground">Redirecting...</p>
    </div>
  );
}
