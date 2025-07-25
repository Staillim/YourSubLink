
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Logo, TikTokIcon } from '@/components/icons';
import { BarChart3, MessageSquare, DollarSign, ArrowRight, CheckCircle, ExternalLink, Youtube, Facebook, Instagram, ThumbsUp, Globe, Bot, Wallet, Users, Link2 as LinkIconLucide, Edit, Share2, Award, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ThemeSwitcher } from '@/components/theme-switcher';


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
                <div className="flex items-center gap-2">
                    <ThemeSwitcher />
                    <Button asChild variant="ghost">
                        <Link href="/auth">Sign In</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/auth">Register</Link>
                    </Button>
                </div>
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
                     <div className="container mx-auto text-center">
                        <h2 className="text-3xl font-bold mb-4">Monetization in Action</h2>
                        <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">This is what visitors see: a clean interface with clear steps. Each step completed brings you closer to your earnings.</p>
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


                {/* Why us Section */}
                <section className="py-16 px-4 bg-muted/40">
                    <div className="container mx-auto">
                        <h2 className="text-3xl font-bold text-center mb-12">
                            ¿Por qué usar YourSubLink?
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <Card className="flex flex-col items-center text-center p-6">
                                <ShieldCheck className="h-12 w-12 text-primary mb-4" />
                                <h3 className="text-xl font-semibold mb-2">Advanced Monetization</h3>
                                <p className="text-muted-foreground">
                                    Maximize your earnings with our rule system and custom CPMs for top-performing users.
                                </p>
                            </Card>
                            <Card className="flex flex-col items-center text-center p-6">
                                <BarChart3 className="h-12 w-12 text-primary mb-4" />
                                <h3 className="text-xl font-semibold mb-2">Intuitive Dashboard</h3>
                                <p className="text-muted-foreground">
                                    Manage your links, track earnings, and get insights from a clean, modern interface available on all your devices.
                                </p>
                            </Card>
                            <Card className="flex flex-col items-center text-center p-6">
                                <Wallet className="h-12 w-12 text-primary mb-4" />
                                <h3 className="text-xl font-semibold mb-2">Reliable Payouts & Support</h3>
                                <p className="text-muted-foreground">
                                    Request your earnings with a few clicks and get help directly from our integrated support chat. We are here for you.
                                </p>
                            </Card>
                        </div>
                    </div>
                </section>

                 {/* How it works Section */}
                <section className="py-16 px-4">
                    <div className="container mx-auto text-center">
                        <h2 className="text-3xl font-bold mb-4">Getting Started is Easy</h2>
                        <p className="text-muted-foreground mb-12 max-w-2xl mx-auto">In just a few simple steps, you can be on your way to earning.</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                            <div className="flex flex-col items-center md:items-start text-center md:text-left gap-4">
                                <div className="flex items-center justify-center bg-primary/10 text-primary rounded-full h-12 w-12">
                                    <Edit className="h-6 w-6"/>
                                </div>
                                <h3 className="text-xl font-semibold">1. Create & Customize</h3>
                                <p className="text-muted-foreground">Shorten any URL and add monetization rules in our simple editor. Choose from different social media actions to engage your audience.</p>
                            </div>
                            <div className="flex flex-col items-center md:items-start text-center md:text-left gap-4">
                                <div className="flex items-center justify-center bg-primary/10 text-primary rounded-full h-12 w-12">
                                    <Share2 className="h-6 w-6"/>
                                </div>
                                <h3 className="text-xl font-semibold">2. Share Your Link</h3>
                                <p className="text-muted-foreground">Distribute your new, powerful link across your social media, website, or any platform to reach your followers.</p>
                            </div>
                            <div className="flex flex-col items-center md:items-start text-center md:text-left gap-4">
                                <div className="flex items-center justify-center bg-primary/10 text-primary rounded-full h-12 w-12">
                                    <Award className="h-6 w-6"/>
                                </div>
                                <h3 className="text-xl font-semibold">3. Earn & Analyze</h3>
                                <p className="text-muted-foreground">Watch your earnings grow with every click. Track your performance with our detailed analytics and request payouts easily.</p>
                            </div>
                        </div>
                    </div>
                </section>
                
                 {/* Community Section */}
                <section className="py-16 px-4 bg-muted/40">
                    <div className="container mx-auto text-center">
                        <h2 className="text-3xl font-bold mb-4">Be Part of Our Community</h2>
                        <p className="max-w-3xl mx-auto text-lg text-muted-foreground">
                            We are committed to building a community that is flexible, generous, and focused on our users. Your success is our success, and we're excited to grow with you.
                        </p>
                    </div>
                </section>

            </main>

            {/* Footer */}
            <footer className="py-8 bg-muted/40 border-t">
                <div className="container mx-auto text-center text-muted-foreground flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p>&copy; {new Date().getFullYear()} YourSubLink. All rights reserved.</p>
                    <div className="flex gap-4">
                        <Link href="#" className="text-sm hover:text-primary transition-colors">Terms of Service</Link>
                        <Link href="#" className="text-sm hover:text-primary transition-colors">Privacy Policy</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
