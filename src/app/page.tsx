'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Logo, TikTokIcon } from '@/components/icons';
import { BarChart3, MessageSquare, DollarSign, ArrowRight, CheckCircle, ExternalLink, Youtube, Facebook, Instagram, ThumbsUp, Globe, Bot } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';


const DemoRule = ({ icon: Icon, text, className, isCompleted }: { icon: any, text: string, className: string, isCompleted?: boolean }) => (
    <div className={cn("flex items-center justify-between p-3 rounded-lg transition-all text-left", className, isCompleted && "bg-green-600 hover:bg-green-600/90 ring-1 ring-green-400 !text-white")}>
        <div className="flex items-center gap-3">
            {isCompleted ? <CheckCircle className="h-5 w-5 shrink-0" /> : <Icon className="h-5 w-5 shrink-0" />}
            <span className="font-semibold text-sm">{text}</span>
        </div>
        {!isCompleted && <ExternalLink className="h-5 w-5 shrink-0" />}
    </div>
);

export default function LandingPage() {
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm">
                <Logo />
                <Button asChild>
                    <Link href="/auth">Sign In</Link>
                </Button>
            </header>

            <main className="flex-1">
                {/* Hero Section */}
                <section className="flex flex-col items-center justify-center text-center pt-32 pb-16 px-4">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                        Shorten, Monetize, and Analyze Your Links
                    </h1>
                    <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
                        YourSubLink is the all-in-one platform to turn your links into a source of income, with powerful analytics and direct support.
                    </p>
                    <div className="mt-8 flex gap-4">
                        <Button asChild size="lg" className="font-semibold">
                            <Link href="/auth">Get Started for Free <ArrowRight className="ml-2 h-5 w-5"/></Link>
                        </Button>
                    </div>
                </section>

                {/* Monetization Showcase */}
                <section className="py-16 px-4">
                    <div className="container mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="text-center lg:text-left">
                            <h2 className="text-3xl font-bold mb-4">Monetization in Action</h2>
                            <p className="text-muted-foreground mb-6">
                                Instead of a simple redirect, your visitors complete a series of quick and easy steps you define. Each completed step contributes to your earnings. You control the rules, you control the income.
                            </p>
                            <ul className="space-y-2 text-left">
                                <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /> <span>Increase engagement on your social media.</span></li>
                                <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /> <span>High and customizable CPM rates.</span></li>
                                <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /> <span>AI-powered anti-bot detection to ensure real views.</span></li>
                            </ul>
                        </div>
                        <Card className="w-full max-w-md mx-auto shadow-2xl bg-card">
                            <CardContent className="p-6 space-y-3">
                                <p className="text-center text-sm font-semibold text-muted-foreground">COMPLETE THE STEPS TO UNLOCK THE LINK</p>
                                <DemoRule icon={Youtube} text="Subscribe on YouTube" className="bg-[#FF0000] hover:bg-[#FF0000]/90 text-white" isCompleted />
                                <DemoRule icon={TikTokIcon} text="Follow on TikTok" className="bg-black hover:bg-black/90 text-white" />
                                <DemoRule icon={Facebook} text="Like on Facebook" className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white" />
                                <DemoRule icon={Globe} text="Visit our Website" className="bg-muted hover:bg-muted/90 text-muted-foreground" />
                                <Button disabled className="w-full !mt-5" size="lg">Unlock Link</Button>
                            </CardContent>
                        </Card>
                    </div>
                </section>


                {/* Features Section */}
                <section className="py-16 px-4 bg-muted/40">
                    <div className="container mx-auto">
                        <h2 className="text-3xl font-bold text-center mb-12">
                            Everything You Need to Succeed
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <Card className="flex flex-col items-center text-center p-6">
                                <BarChart3 className="h-12 w-12 text-primary mb-4" />
                                <h3 className="text-xl font-semibold mb-2">Detailed Analytics</h3>
                                <p className="text-muted-foreground">
                                    Understand your audience with detailed click tracking, performance graphs, and revenue breakdowns for each link.
                                </p>
                            </Card>
                            <Card className="flex flex-col items-center text-center p-6">
                                <DollarSign className="h-12 w-12 text-primary mb-4" />
                                <h3 className="text-xl font-semibold mb-2">Flexible Monetization</h3>
                                <p className="text-muted-foreground">
                                    Benefit from a global CPM rate or earn a custom, higher rate based on your performance. We reward our best users.
                                </p>
                            </Card>
                            <Card className="flex flex-col items-center text-center p-6">
                                <MessageSquare className="h-12 w-12 text-primary mb-4" />
                                <h3 className="text-xl font-semibold mb-2">Direct Support Chat</h3>
                                <p className="text-muted-foreground">
                                    Have a question? Get help directly from our integrated support chat inside your user dashboard. We are here for you.
                                </p>
                            </Card>
                        </div>
                    </div>
                </section>

                 {/* Image Showcase */}
                <section className="py-20 px-4">
                    <div className="container mx-auto text-center">
                        <h2 className="text-3xl font-bold mb-4">A Powerful and Intuitive Dashboard</h2>
                        <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">Manage your links, track your earnings, and get insights from a clean and modern interface, available on all your devices.</p>
                         <div className="flex flex-col lg:flex-row justify-center items-center gap-8">
                            {/* Desktop Mockup */}
                            <div className="relative mx-auto border-slate-800 dark:border-slate-800 bg-slate-800 border-[8px] rounded-t-xl w-full max-w-4xl h-auto shadow-2xl">
                                <Image
                                    src="https://placehold.co/1200x675.png"
                                    alt="Dashboard Screenshot"
                                    width={1200}
                                    height={675}
                                    data-ai-hint="dashboard analytics"
                                    className="rounded-t-lg"
                                />
                            </div>
                            {/* Mobile Mockup */}
                            <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-xl">
                                <div className="w-[140px] h-[18px] bg-gray-800 top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute"></div>
                                <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[124px] rounded-s-lg"></div>
                                <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[178px] rounded-s-lg"></div>
                                <div className="h-[64px] w-[3px] bg-gray-800 absolute -end-[17px] top-[142px] rounded-e-lg"></div>
                                <div className="rounded-[2rem] overflow-hidden w-full h-full bg-white dark:bg-black">
                                     <Image
                                        src="https://placehold.co/300x600.png"
                                        alt="Mobile App Screenshot"
                                        width={300}
                                        height={600}
                                        data-ai-hint="mobile interface"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                         </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="py-8 bg-muted/40">
                <div className="container mx-auto text-center text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} YourSubLink. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
