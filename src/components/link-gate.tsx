
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { Rule } from '@/components/rule-editor';
import type { LinkData } from '@/types';
import { Loader2, ExternalLink, CheckCircle2, Lock, Link as LinkIcon, ChevronRight, Youtube, Instagram, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';


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


function CountdownPage({ onContinue }: { onContinue: () => void }) {
    const [countdown, setCountdown] = useState(5);
    const isCountdownFinished = countdown === 0;

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md shadow-2xl bg-card border-gray-800">
                <CardHeader className="text-center items-center pt-8">
                     <Timer className="h-12 w-12 text-primary" />
                    <CardTitle className="text-3xl font-bold tracking-tight">Please wait</CardTitle>
                    <CardDescription className="text-muted-foreground text-base pt-1">
                        Your link will be available shortly.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center px-6 pb-8 pt-4">
                   {isCountdownFinished ? (
                        <Button onClick={onContinue} className="w-full font-bold text-lg py-7 mt-4 bg-green-600 hover:bg-green-700" size="lg">
                            Continue to Link
                        </Button>
                   ) : (
                        <div className="text-6xl font-bold text-primary tabular-nums">
                            {countdown}
                        </div>
                   )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function LinkGate({ linkData, onUnlock, onContinue, initialStatus = 'gate' }: { linkData: LinkData, onUnlock: () => void, onContinue: () => void, initialStatus?: 'gate' | 'countdown' }) {
    const [completedRules, setCompletedRules] = useState<boolean[]>(Array(linkData.rules.length).fill(false));
    const [status, setStatus] = useState<'gate' | 'countdown'>(initialStatus);
    
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

    // This is called when the user clicks the "Unlock Link" button.
    // It calls the `onUnlock` function passed from the parent, which handles changing the view.
    const handleUnlockClick = () => {
        if (!allRulesCompleted) return;
        onUnlock(); 
    }
    
    if (status === 'countdown') {
        return <CountdownPage onContinue={onContinue} />;
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
                        disabled={!allRulesCompleted}
                        className="w-full font-bold text-lg py-7 mt-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-800 disabled:text-muted-foreground disabled:cursor-not-allowed"
                        size="lg"
                    >
                        <div className="flex items-center justify-center w-full gap-2">
                           <Lock className="h-5 w-5"/>
                           {allRulesCompleted ? <span>Unlock Link</span> : <span>Complete all actions</span>}
                        </div>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
