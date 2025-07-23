
'use client';

import { useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { Loader2, ExternalLink, CheckCircle2, Lock, Link as LinkIcon, ChevronRight, Youtube, Instagram } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
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


export default function ClientComponent() {
  const params = useParams();
  const shortId = params.shortId as string;
  const [status, setStatus] = useState<'loading' | 'gate' | 'redirecting' | 'not-found'>('loading');
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  
  useEffect(() => {
    if (!shortId) return;

    const processLinkVisit = async () => {
      // 1. Fetch link data from Firestore
      const q = query(collection(db, 'links'), where('shortId', '==', shortId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setStatus('not-found');
        return;
      }
      
      const linkDoc = querySnapshot.docs[0];
      const data = linkDoc.data();

      // 2. Client-side uniqueness check using localStorage
      let isUniqueByClient = false;
      try {
        const visits = JSON.parse(localStorage.getItem('yoursublink_visits') || '{}');
        const lastVisit = visits[shortId];
        const oneHour = 60 * 60 * 1000;
        if (!lastVisit || (Date.now() - lastVisit > oneHour)) {
          isUniqueByClient = true;
        }
      } catch (e) {
        console.error("Could not access localStorage. Assuming unique visit.", e);
        isUniqueByClient = true; // Fallback to true if localStorage fails
      }
      
      // 3. Fire off the click processing to the API in the background.
      fetch(`/api/click`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shortId: shortId, isUniqueByClient: isUniqueByClient }),
      }).then(res => res.json())
        .then(apiResponse => {
           // 4. On successful processing, update localStorage with the new timestamp
           if (apiResponse.success && isUniqueByClient) {
              try {
                const visits = JSON.parse(localStorage.getItem('yoursublink_visits') || '{}');
                visits[shortId] = apiResponse.timestamp;
                localStorage.setItem('yoursublink_visits', JSON.stringify(visits));
              } catch (e) {
                console.error("Failed to update localStorage with new visit.", e);
              }
           }
        })
        .catch(error => {
        // Log error but don't block the user.
        console.error("Failed to record click:", error);
      });

      // 5. Decide whether to redirect or show the gate
      if (data.rules && data.rules.length > 0) {
        const currentLinkData: LinkData = {
          id: linkDoc.id,
          original: data.original,
          rules: data.rules,
          monetizable: data.monetizable || false,
          userId: data.userId,
          realClicks: data.realClicks || 0,
          title: data.title,
        };
        setLinkData(currentLinkData);
        setStatus('gate');
      } else {
        setStatus('redirecting');
        window.location.href = data.original;
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
