'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Logo } from '@/components/icons';
import { BarChart3, Edit, Share2, Award, ShieldCheck, Wallet } from 'lucide-react';
import Image from 'next/image';
import { ThemeSwitcher } from '@/components/theme-switcher';


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
                            <Link href="/auth">Get Started for Free</Link>
                        </Button>
                    </div>
                </section>

                {/* Monetization Showcase */}
                <section className="py-16 px-4">
                    <div className="container mx-auto text-center">
                        <h2 className="text-3xl font-bold mb-4">Monetization in Action</h2>
                        <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">This is what visitors see: a clean interface with clear steps. Each step completed brings you closer to your earnings.</p>
                        <div className="relative mx-auto max-w-4xl space-y-8">
                            <Image
                                src="/pc-interface.png"
                                alt="PC Interface"
                                width={1200}
                                height={675}
                                className="rounded-xl shadow-2xl"
                            />
                             <Image
                                src="/mobile-interface.jpg"
                                alt="Mobile Interface"
                                width={400}
                                height={800}
                                className="rounded-xl shadow-2xl mx-auto"
                            />
                        </div>
                    </div>
                </section>
                
                {/* Community Section */}
                <section className="py-16 px-4">
                    <div className="container mx-auto text-center">
                        <h2 className="text-3xl font-bold mb-4">Be Part of Our Community</h2>
                        <p className="max-w-3xl mx-auto text-lg text-muted-foreground">
                            We are committed to building a community that is flexible, generous, and focused on our users. Your success is our success, and we're excited to grow with you.
                        </p>
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
                                    Manage your links, track your earnings, and get insights from a clean, modern interface available on all your devices.
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