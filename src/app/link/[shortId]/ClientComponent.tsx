
'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
import { Loader2, ExternalLink, CheckCircle2, Lock, Link as LinkIcon, ChevronRight, Youtube, Instagram, Timer } from 'lucide-react';
import type { Rule } from '@/components/rule-editor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';


type LinkData = {
  id: string;
  original: string;
  rules: Rule[];
  title: string;
  description?: string;
  userId: string;
  monetizable: boolean;
  clicks: number;
};

const RULE_DETAILS = {
  like: { text: 'Like & Comment on Video', icon: Youtube, color: 'bg-red-600 hover:bg-red-700' },
  subscribe: { text: 'Subscribe On Youtube', icon: Youtube, color: 'bg-red-600 hover:bg-red-700' },
  follow: { text: 'Follow On Instagram', icon: Instagram, color: 'bg-blue-600 hover:bg-blue-700' },
  visit: { text: 'Visit Website', icon: ExternalLink, color: 'bg-gray-500 hover:bg-gray-600' },
};

async function recordClick(linkData: LinkData): Promise<void> {
    try {
        const batch = writeBatch(db);
        
        // 1. Create a historical click record
        const clickDocRef = doc(collection(db, 'clicks'));
        batch.set(clickDocRef, {
            linkId: linkData.id,
            timestamp: serverTimestamp(),
        });

        // 2. Increment the total and real clicks counter on the link
        const linkRef = doc(db, 'links', linkData.id);
        batch.update(linkRef, { 
            clicks: increment(1),
            realClicks: increment(1) 
        });
        
        // 3. Handle monetization earnings for the click if applicable
        if (linkData.monetizable) {
            const CPM = 3.00; // Cost Per Mille (1000 views)
            const earningsPerClick = CPM / 1000;
            const linkEarningsUpdate = { generatedEarnings: increment(earningsPerClick) };
            batch.update(linkRef, linkEarningsUpdate);
        }

        // 4. Handle milestone notifications
        const currentClicks = linkData.clicks;
        const newClicks = currentClicks + 1;
        const milestone = 1000;
        if (Math.floor(currentClicks / milestone) < Math.floor(newClicks / milestone)) {
            const reachedMilestone = Math.floor(newClicks / milestone) * milestone;
            const notificationRef = doc(collection(db, 'notifications'));
            batch.set(notificationRef, {
                userId: linkData.userId,
                linkId: linkData.id,
                linkTitle: linkData.title,
                type: 'milestone',
                milestone: reachedMilestone,
                message: `Your link "${linkData.title}" reached ${reachedMilestone.toLocaleString()} visits!`,
                createdAt: serverTimestamp(),
                read: false
            });
        }

        await batch.commit();
        console.log("Click recorded successfully.");
        
    } catch (error) {
        console.error("Error processing click:", error);
    }
}


function RuleItem({ rule, onComplete, isCompleted }: { rule: Rule; onComplete: () => void; isCompleted: boolean }) {
  const [isClicked, setIsClicked] = useState(false);
  const [verifyingText, setVerifyingText] = useState('Verificando');

  const { text, icon: Icon, color } = RULE_DETAILS[rule.type] || RULE_DETAILS.visit;

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
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

  const buttonClasses = cn(
    "w-full justify-between h-auto py-4 px-5 text-base font-semibold",
    "inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    isCompleted ? 'bg-green-600 hover:bg-green-700 text-primary-foreground' : color,
    (isClicked && !isCompleted) ? 'disabled:opacity-100 cursor-wait' : 'cursor-pointer'
  );

  return (
    <div
      onClick={handleClick}
      className={buttonClasses}
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
    </div>
  );
}


function LinkGate({ linkData, onAllRulesCompleted }: { linkData: LinkData, onAllRulesCompleted: () => void }) {
    const [completedRules, setCompletedRules] = useState<boolean[]>(Array(linkData.rules.length).fill(false));
    
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
    
    useEffect(() => {
        if(allRulesCompleted) {
            // Give a moment for the UI to update before triggering the next step
            const timer = setTimeout(() => {
                 onAllRulesCompleted();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [allRulesCompleted, onAllRulesCompleted]);
    
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
                        disabled={!allRulesCompleted}
                        className="w-full font-bold text-lg py-7 mt-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-800 disabled:text-muted-foreground disabled:cursor-not-allowed"
                        size="lg"
                    >
                        <div className="flex items-center justify-center w-full gap-2">
                           <Lock className="h-5 w-5"/>
                           {allRulesCompleted ? <span>Link Unlocked!</span> : <span>Unlock Link</span>}
                        </div>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}

function CountdownPage({ linkData }: { linkData: LinkData }) {
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            window.location.href = linkData.original;
        }
    }, [countdown, linkData.original]);

    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md shadow-2xl bg-card border-gray-800">
                <CardHeader className="text-center items-center pt-8">
                     <Timer className="h-12 w-12 text-primary" />
                    <CardTitle className="text-3xl font-bold tracking-tight">Redirecting</CardTitle>
                    <CardDescription className="text-muted-foreground text-base pt-1">
                        Your link will be available in...
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center px-6 pb-8 pt-4">
                    <div className="text-6xl font-bold text-primary tabular-nums">
                        {countdown}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}


export default function ClientComponent({ shortId }: { shortId: string }) {
  const [status, setStatus] = useState<'loading' | 'gate' | 'countdown' | 'redirecting' | 'not-found'>('loading');
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  
  useEffect(() => {
    if (!shortId) {
        setStatus('not-found');
        return;
    };

    const getLink = async () => {
      try {
        const q = query(collection(db, 'links'), where('shortId', '==', shortId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setStatus('not-found');
          return;
        }
        
        const linkDoc = querySnapshot.docs[0];
        const data = linkDoc.data();
        
        const fetchedLinkData: LinkData = {
            id: linkDoc.id,
            original: data.original,
            rules: data.rules || [],
            title: data.title,
            description: data.description,
            userId: data.userId,
            monetizable: data.monetizable || false,
            clicks: data.clicks || 0,
        };
        
        if (fetchedLinkData.rules.length > 0) {
            setLinkData(fetchedLinkData);
            setStatus('gate');
        } else {
            // For links without rules, count it as a real click immediately
            await recordClick(fetchedLinkData);
            setStatus('redirecting');
            window.location.href = fetchedLinkData.original;
        }

      } catch (error) {
        console.error("Error getting link:", error);
        setStatus('not-found');
      }
    };

    getLink();
  }, [shortId]);

  useEffect(() => {
    if (status === 'countdown' && linkData) {
        // This is a "real" click, so we record it now.
        recordClick(linkData);
    }
  }, [status, linkData]);
  
  if (status === 'not-found') {
      notFound();
  }

  if (status === 'loading' || status === 'redirecting') {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
            <Loader2 className="h-12 w-12 animate-spin text-primary"/>
            <p className="mt-4 text-lg text-muted-foreground">Redirecting...</p>
        </div>
      );
  }
  
  if (status === 'gate' && linkData) {
      return <LinkGate linkData={linkData} onAllRulesCompleted={() => setStatus('countdown')} />;
  }
  
  if (status === 'countdown' && linkData) {
      return <CountdownPage linkData={linkData} />;
  }

  return (
     <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary"/>
        <p className="mt-4 text-lg text-muted-foreground">Please wait...</p>
    </div>
  );
}
