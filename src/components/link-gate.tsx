
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { LinkData } from '@/types';
import { Loader2, ArrowRight, CheckCircle, ExternalLink } from 'lucide-react';

export default function LinkGate({ linkData, onAllStepsCompleted }: { linkData: LinkData, onAllStepsCompleted: () => void }) {
  const [step, setStep] = useState<'rules' | 'countdown'>('rules');
  const [countdown, setCountdown] = useState(5);
  const [isReady, setIsReady] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (step === 'countdown') {
        if (countdown > 0) {
            document.title = `Redirecting in ${countdown}...`;
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            document.title = "You can proceed!";
            setIsReady(true);
        }
    }
  }, [step, countdown]);
  
  const handleContinue = () => {
    setIsRedirecting(true);
    onAllStepsCompleted();
  }

  const handleUnlock = () => {
    setStep('countdown');
  }

  const getRuleDescription = (type: string) => {
    const descriptions: { [key: string]: string } = {
        'like': 'Like & Comment on this Video:',
        'subscribe': 'Subscribe to this Channel:',
        'follow': 'Follow this Profile:',
        'visit': 'Visit this Website:',
    };
    return descriptions[type] || 'Complete this action:';
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl bg-card border-gray-800">
         {step === 'rules' && (
            <>
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold tracking-tight">Complete the steps</CardTitle>
                    <CardDescription className="text-muted-foreground text-base pt-1">
                        To unlock the link, please complete the following steps.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-3">
                        {linkData.rules.map((rule, index) => (
                            <a 
                                href={rule.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                key={index}
                                className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                            >
                                <div className="flex flex-col">
                                    <span className="font-semibold">{getRuleDescription(rule.type)}</span>
                                    <span className="text-xs text-muted-foreground truncate">{rule.url}</span>
                                </div>
                                <ExternalLink className="h-5 w-5 text-primary shrink-0" />
                            </a>
                        ))}
                    </div>

                    <Button
                        onClick={handleUnlock}
                        className="w-full font-bold text-lg py-7 mt-4 bg-primary hover:bg-primary/90"
                        size="lg"
                    >
                        <CheckCircle className="mr-2 h-5 w-5"/>
                        Unlock Link
                    </Button>
                </CardContent>
            </>
        )}

        {step === 'countdown' && (
            <>
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold tracking-tight">Almost there!</CardTitle>
                    <CardDescription className="text-muted-foreground text-base pt-1">
                        You are about to be redirected.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-center">
                    {isReady ? (
                        <p className="text-lg font-semibold text-green-500">You can now proceed to your link.</p>
                    ) : (
                        <div className="flex flex-col items-center justify-center space-y-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-muted-foreground">Please wait...</p>
                            <p className="text-4xl font-bold">{countdown}</p>
                        </div>
                    )}
                    
                    <Button
                        onClick={handleContinue}
                        disabled={!isReady || isRedirecting}
                        className="w-full font-bold text-lg py-7 mt-4 bg-primary hover:bg-primary/90 disabled:bg-gray-800 disabled:text-muted-foreground"
                        size="lg"
                    >
                        {isRedirecting ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            <ArrowRight className="mr-2 h-5 w-5"/>
                        )}
                        {isRedirecting ? 'Redirecting...' : 'Continue'}
                    </Button>

                    <div className="text-xs text-muted-foreground pt-4">
                        <p>Your destination: <span className="font-semibold truncate">{linkData.original}</span></p>
                    </div>
                </CardContent>
            </>
        )}
      </Card>
    </div>
  );
}
