
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { Rule } from '@/components/rule-editor';
import type { LinkData } from '@/types';
import { Loader2, ExternalLink, CheckCircle2, Lock, Link as LinkIcon } from 'lucide-react';

export default function LinkGate({ linkData, onAllStepsCompleted }: { linkData: LinkData, onAllStepsCompleted: () => void }) {
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(Array(linkData.rules.length).fill(false));
  const [isVerifying, setIsVerifying] = useState(false);
  
  const totalSteps = linkData.rules.length;
  const completedCount = completedSteps.filter(Boolean).length;
  const allStepsCompleted = completedCount === totalSteps;

  const handleCompleteStep = (index: number) => {
    setCompletedSteps(prev => {
      const newCompleted = [...prev];
      newCompleted[index] = true;
      return newCompleted;
    });
  };

  const handleVerify = () => {
    setIsVerifying(true);
    // Simulate verification delay then call the parent function
    setTimeout(() => {
        setIsVerifying(false);
        if (allStepsCompleted) {
             onAllStepsCompleted();
        }
    }, 1500);
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl bg-card border-gray-800">
        <CardHeader className="text-center">
            <LinkIcon className="h-10 w-10 mx-auto text-primary" />
            <CardTitle className="text-3xl font-bold tracking-tight">{linkData.title}</CardTitle>
            <CardDescription className="text-muted-foreground text-base pt-1">
                {linkData.description || 'Complete the steps to continue to your link.'}
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-3">
                {linkData.rules.map((rule, index) => (
                    <RuleItem 
                        key={index}
                        rule={rule}
                        onComplete={() => handleCompleteStep(index)}
                        isCompleted={completedSteps[index]}
                    />
                ))}
            </div>

            <div className="pt-4 space-y-2">
                <Progress value={(completedCount / totalSteps) * 100} className="w-full" />
                <p className="text-center text-sm font-medium text-muted-foreground">
                    {completedCount} of {totalSteps} steps completed
                </p>
            </div>

            <Button
                onClick={handleVerify}
                disabled={!allStepsCompleted || isVerifying}
                className="w-full font-bold text-lg py-7 mt-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-800 disabled:text-muted-foreground"
                size="lg"
            >
                {isVerifying ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                    <Lock className="mr-2 h-5 w-5"/>
                )}
                {isVerifying ? 'Verifying...' : (allStepsCompleted ? 'Unlock Link' : 'Complete all steps')}
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function RuleItem({ rule, onComplete, isCompleted }: { rule: Rule, onComplete: () => void, isCompleted: boolean }) {
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = () => {
    if (isCompleted || isClicked) return;
    
    window.open(rule.url, '_blank');
    setIsClicked(true);
    
    // Simulate task completion after a delay
    setTimeout(() => {
        onComplete();
    }, 5000); // 5 second delay to simulate user action
  };

  return (
    <Button
      variant={isCompleted ? 'default' : 'secondary'}
      className={`w-full justify-between h-14 ${isCompleted ? 'bg-green-600 hover:bg-green-700' : ''}`}
      onClick={handleClick}
      disabled={isCompleted || isClicked}
    >
      <div className="flex items-center gap-2">
        <ExternalLink className="h-5 w-5" />
        <span>{rule.type === 'visit' ? 'Visit Website' : `Action: ${rule.type}`}</span>
      </div>
      {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : (isClicked ? <Loader2 className="animate-spin h-5 w-5" /> : null)}
    </Button>
  );
}
