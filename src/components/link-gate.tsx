
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import type { LinkData, SponsorRule } from '@/types';
import { getActiveSponsors } from '@/types';
import { Loader2, ArrowRight, CheckCircle, ExternalLink, LogIn, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Facebook, Instagram, Youtube,Globe, MessageCircle, ThumbsUp } from 'lucide-react';
import { Logo, TikTokIcon } from '@/components/icons';
import { SponsorRuleItem } from '@/components/sponsor-rule-item';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';


function LoadingDots() {
    return (
        <div className="flex items-center space-x-1">
            <span className="animate-[pulse_1.5s_ease-in-out_infinite] rounded-full h-1.5 w-1.5 bg-current"></span>
            <span className="animate-[pulse_1.5s_ease-in-out_0.2s_infinite] rounded-full h-1.5 w-1.5 bg-current"></span>
            <span className="animate-[pulse_1.5s_ease-in-out_0.4s_infinite] rounded-full h-1.5 w-1.5 bg-current"></span>
        </div>
    )
}

const getPlatformStyle = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return { 
            icon: Youtube, 
            className: 'bg-[#FF0000] hover:bg-[#FF0000]/90 text-white',
            platformName: 'YouTube'
        };
    }
    if (url.includes('facebook.com')) {
        return { 
            icon: Facebook, 
            className: 'bg-[#1877F2] hover:bg-[#1877F2]/90 text-white',
            platformName: 'Facebook'
        };
    }
    if (url.includes('instagram.com')) {
        return { 
            icon: Instagram, 
            className: 'bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 hover:opacity-90 text-white',
            platformName: 'Instagram'
        };
    }
    if (url.includes('tiktok.com')) {
        return { 
            icon: TikTokIcon, 
            className: 'bg-black hover:bg-black/90 text-white',
            platformName: 'TikTok'
        };
    }
    return { 
        icon: Globe, 
        className: 'bg-muted hover:bg-muted/90 text-muted-foreground',
        platformName: 'Website'
    };
};

const getRuleDetails = (rule: LinkData['rules'][0]) => {
    const platformStyle = getPlatformStyle(rule.url);
    switch (rule.type) {
        case 'like':
            return { ...platformStyle, icon: ThumbsUp, text: `Like this ${platformStyle.platformName} content` };
        case 'comment':
            return { ...platformStyle, icon: MessageCircle, text: `Comment on this ${platformStyle.platformName} content` };
        case 'subscribe':
            return { ...platformStyle, icon: Youtube, text: `Subscribe on ${platformStyle.platformName}` };
        case 'follow':
            return { ...platformStyle, text: `Follow on ${platformStyle.platformName}` };
        case 'visit':
        default:
            return { ...platformStyle, icon: Globe, text: 'Visit this Website' };
    }
};


export default function LinkGate({ linkData, onAllStepsCompleted }: { linkData: LinkData, onAllStepsCompleted: () => void }) {
  const [step, setStep] = useState<'rules' | 'countdown'>('rules');
  const [countdown, setCountdown] = useState(5);
  const [isReady, setIsReady] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // State to track rule status: pending, loading, or completed
  const [ruleStates, setRuleStates] = useState<('pending' | 'loading' | 'completed')[]>(
    () => Array((linkData.rules || []).length).fill('pending')
  );

  // NUEVO: Estado para sponsors
  const [allSponsors, setAllSponsors] = useState<SponsorRule[]>([]);
  const [sponsorStates, setSponsorStates] = useState<Record<string, 'pending' | 'loading' | 'completed'>>({});
  const [sponsorTracking, setSponsorTracking] = useState<{
    views: Record<string, boolean>;
    completions: Record<string, boolean>;
  }>({ views: {}, completions: {} });

  // Filtrar sponsors activos (no expirados)
  const activeSponsors = useMemo(() => getActiveSponsors(allSponsors), [allSponsors]);

  // Inicializar estados de sponsors cuando se cargan
  useEffect(() => {
    const initialStates: Record<string, 'pending' | 'loading' | 'completed'> = {};
    activeSponsors.forEach(sponsor => {
      initialStates[sponsor.id] = 'pending';
    });
    setSponsorStates(initialStates);
  }, [activeSponsors]);

  // Cargar sponsors del enlace
  useEffect(() => {
    const loadSponsors = async () => {
      try {
        const sponsorsQuery = query(
          collection(db, 'sponsorRules'),
          where('linkId', '==', linkData.id),
          where('isActive', '==', true)
        );
        const sponsorsSnapshot = await getDocs(sponsorsQuery);
        const sponsors: SponsorRule[] = sponsorsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as SponsorRule));
        
        setAllSponsors(sponsors);
      } catch (error) {
        console.error('Error loading sponsors:', error);
        setAllSponsors([]);
      }
    };

    loadSponsors();
  }, [linkData.id]);

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

  const handleRuleClick = (index: number) => {
    // Prevent action if already loading or completed
    if (ruleStates[index] !== 'pending') return;

    // Set state to loading
    const newRuleStates = [...ruleStates];
    newRuleStates[index] = 'loading';
    setRuleStates(newRuleStates);

    // After 10 seconds, set to completed
    setTimeout(() => {
        setRuleStates(prevStates => {
            const updatedStates = [...prevStates];
            updatedStates[index] = 'completed';
            return updatedStates;
        });
    }, 10000); // 10 seconds
  };
  
  // NUEVO: Funciones para manejar sponsors
  const handleSponsorView = (sponsor: SponsorRule) => {
    setSponsorTracking(prev => ({
      ...prev,
      views: { ...prev.views, [sponsor.id]: true }
    }));
  };

  const handleSponsorComplete = (sponsor: SponsorRule) => {
    setSponsorTracking(prev => ({
      ...prev,
      completions: { ...prev.completions, [sponsor.id]: true }
    }));
  };

  const handleSponsorStateChange = (index: number, state: 'pending' | 'loading' | 'completed') => {
    const sponsor = activeSponsors[index];
    if (sponsor) {
      setSponsorStates(prev => ({
        ...prev,
        [sponsor.id]: state
      }));
    }
  };

  const allRulesCompleted = ruleStates.every(state => state === 'completed');
  const allSponsorsCompleted = activeSponsors.length === 0 || 
    activeSponsors.every(sponsor => sponsorStates[sponsor.id] === 'completed');
  const allTasksCompleted = allRulesCompleted && allSponsorsCompleted;

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="absolute top-4 left-4 sm:top-8 sm:left-8">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="focus:outline-none">
                    <Logo />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                <DropdownMenuItem asChild>
                    <Link href="/">
                        <LogIn className="mr-2 h-4 w-4" />
                        <span>Login</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                        <Link href="/">
                        <UserPlus className="mr-2 h-4 w-4" />
                        <span>Register</span>
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card className="w-full max-w-md shadow-2xl bg-card border-gray-800">
         {step === 'rules' && (
            <>
                <CardHeader className="p-4 sm:p-6 text-center">
                    <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">Complete the steps</CardTitle>
                    <CardDescription className="text-muted-foreground text-sm pt-1">
                        To unlock the link, please complete the following steps.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4 sm:p-6">
                    <div className="space-y-3">
                        {linkData.rules.map((rule, index) => {
                          const state = ruleStates[index];
                          const isCompleted = state === 'completed';
                          const isLoading = state === 'loading';
                          const details = getRuleDetails(rule);
                          const RuleIcon = details.icon;
                          
                          return (
                            <a 
                                href={rule.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                key={index}
                                onClick={() => handleRuleClick(index)}
                                className={cn(
                                  "flex items-center justify-between p-3 rounded-lg transition-all text-left",
                                  details.className,
                                  isCompleted && "bg-green-600 hover:bg-green-600/90 ring-1 ring-green-400 !text-white",
                                  isLoading && "cursor-wait bg-yellow-600 hover:bg-yellow-600/90 !text-white",
                                  state !== 'pending' && "pointer-events-none"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                   {isCompleted ? (
                                     <CheckCircle className="h-5 w-5 shrink-0" />
                                   ) : isLoading ? (
                                     <div className="h-5 w-5 shrink-0 flex items-center justify-center"><LoadingDots/></div>
                                   ) : (
                                     <RuleIcon className="h-5 w-5 shrink-0" />
                                   )}
                                   <div className="flex flex-col">
                                      <span className="font-semibold text-sm">{details.text}</span>
                                   </div>
                                </div>
                                {!isLoading && !isCompleted && <ExternalLink className="h-5 w-5 shrink-0" />}
                            </a>
                          )
                        })}
                    </div>

                    {/* NUEVO: Sección de Sponsors */}
                    {activeSponsors.length > 0 && (
                      <>
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="h-2 w-2 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400"></div>
                            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                              Patrocinadores
                            </h3>
                            <div className="flex-1 h-px bg-gradient-to-r from-amber-200 to-transparent"></div>
                          </div>
                          <div className="space-y-3">
                            {activeSponsors.map((sponsor, index) => (
                              <SponsorRuleItem
                                key={sponsor.id}
                                sponsor={sponsor}
                                index={index}
                                state={sponsorStates[sponsor.id] || 'pending'}
                                onStateChange={handleSponsorStateChange}
                                onView={handleSponsorView}
                                onComplete={handleSponsorComplete}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <Button
                        onClick={handleUnlock}
                        disabled={!allTasksCompleted}
                        className="w-full font-bold text-base py-5 sm:py-6 mt-4 bg-primary hover:bg-primary/90 disabled:bg-gray-800 disabled:text-muted-foreground disabled:cursor-not-allowed"
                        size="lg"
                    >
                        <CheckCircle className="mr-2 h-5 w-5"/>
                        Unlock Link
                    </Button>
                </CardContent>
                <CardFooter className="p-4 sm:p-6 text-center text-sm text-muted-foreground">
                    <p>Want to earn money with your links? <Link href="/" className="font-bold text-primary hover:underline">Register here.</Link></p>
                </CardFooter>
            </>
        )}

        {step === 'countdown' && (
            <>
                <CardHeader className="p-4 sm:p-6 text-center">
                    <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">Almost there!</CardTitle>
                    <CardDescription className="text-muted-foreground text-sm pt-1">
                        You are about to be redirected.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-center p-4 sm:p-6">
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
                        className="w-full font-bold text-base py-5 sm:py-6 mt-4 bg-primary hover:bg-primary/90 disabled:bg-gray-800 disabled:text-muted-foreground"
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
                        <p>Your destination: <span className="font-semibold truncate">{linkData.title}</span></p>
                    </div>
                </CardContent>
            </>
        )}
      </Card>
    </div>
  );
}
