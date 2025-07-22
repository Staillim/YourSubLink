
'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { Loader2, ExternalLink, CheckCircle2, LockKeyhole } from 'lucide-react';
import type { Rule } from '@/components/rule-editor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Logo } from '@/components/icons';

type LinkData = {
  original: string;
  rules: Rule[];
  title: string;
  description?: string;
};

const RULE_DESCRIPTIONS = {
  like: 'Da like al vídeo',
  subscribe: 'Suscríbete al canal',
  follow: 'Sigue la cuenta en Instagram',
  visit: 'Visita el sitio web',
};

function RuleItem({ rule, onComplete }: { rule: Rule; onComplete: () => void }) {
  const [isClicked, setIsClicked] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleClick = () => {
    if (isCompleted || isClicked) return;

    window.open(rule.url, '_blank');
    setIsClicked(true);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(timer);
          setIsCompleted(true);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isClicked && !isCompleted}
      className="w-full justify-between h-auto py-3 px-4"
      variant={isCompleted ? 'secondary' : 'outline'}
    >
      <div className="flex items-center gap-3">
        {isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <LockKeyhole className="h-5 w-5 text-muted-foreground" />
        )}
        <span className="font-semibold">{RULE_DESCRIPTIONS[rule.type] || 'Completar tarea'}</span>
      </div>
      <div>
        {isClicked && !isCompleted && (
           <span className="text-sm font-mono bg-muted text-muted-foreground rounded-md px-2 py-1">{countdown}s</span>
        )}
        {isCompleted && (
            <span className="text-sm font-semibold text-green-500">¡Hecho!</span>
        )}
        {!isClicked && !isCompleted && (
            <ExternalLink className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
    </Button>
  );
}


function LinkGate({ linkData }: { linkData: LinkData }) {
    const [completedRules, setCompletedRules] = useState(0);
    const totalRules = linkData.rules.length;
    const allRulesCompleted = completedRules === totalRules;

    const handleRuleComplete = () => {
        setCompletedRules((prev) => prev + 1);
    }
    
    const handleRedirect = () => {
        if(allRulesCompleted) {
            window.location.href = linkData.original;
        }
    }

    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
             <div className="absolute top-8">
                <Logo />
            </div>
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold tracking-tight">{linkData.title}</CardTitle>
                    {linkData.description && (
                        <CardDescription>{linkData.description}</CardDescription>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-center text-sm font-medium text-foreground">Completa los siguientes pasos para continuar:</p>
                    <div className="space-y-3">
                        {linkData.rules.map((rule, index) => (
                            <RuleItem key={index} rule={rule} onComplete={handleRuleComplete} />
                        ))}
                    </div>

                    <Button
                        onClick={handleRedirect}
                        disabled={!allRulesCompleted}
                        className="w-full font-bold text-lg py-6 mt-4"
                        size="lg"
                    >
                        {allRulesCompleted ? 'Continuar al enlace' : `Completa ${totalRules - completedRules} paso(s) más`}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}


export default function ShortLinkPage({ params }: { params: { shortId: string } }) {
  const { shortId } = params;
  const [status, setStatus] = useState<'loading' | 'redirect' | 'gate' | 'not-found'>('loading');
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  
  useEffect(() => {
    const getLink = async () => {
      try {
        const q = query(collection(db, 'links'), where('shortId', '==', shortId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setStatus('not-found');
          return;
        }
        
        const linkDoc = querySnapshot.docs[0];
        const data = linkDoc.data() as LinkData & { clicks: number };
        
        // Increment click count
        const linkRef = doc(db, 'links', linkDoc.id);
        await updateDoc(linkRef, {
            clicks: increment(1)
        });
        
        setLinkData({
            original: data.original,
            rules: data.rules || [],
            title: data.title,
            description: data.description,
        });

        if (data.rules && data.rules.length > 0) {
            setStatus('gate');
        } else {
            setStatus('redirect');
        }

      } catch (error) {
        console.error("Error getting link:", error);
        setStatus('not-found');
      }
    };

    getLink();
  }, [shortId]);
  
  useEffect(() => {
    if (status === 'redirect' && linkData) {
         window.location.href = linkData.original;
    }
    if(status === 'not-found') {
        notFound();
    }
  }, [status, linkData]);

  if (status === 'loading' || status === 'redirect') {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
            <Loader2 className="h-12 w-12 animate-spin text-primary"/>
            <p className="mt-4 text-lg text-muted-foreground">Redireccionando...</p>
        </div>
      );
  }
  
  if (status === 'gate' && linkData) {
      return <LinkGate linkData={linkData} />;
  }

  return null;
}
