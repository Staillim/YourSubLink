
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Eye, User, Calendar, BarChart, Target, MousePointer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, getMonth, getYear } from 'date-fns';
import type { SponsorRule } from '../../../../types';
import { Badge } from '@/components/ui/badge';
import { ClicksTooltip } from '../../../../components/charts/enhanced-tooltips';

type LinkData = {
    title: string;
    original: string;
    clicks: number; // Total Clicks
    userName: string;
    generatedEarnings?: number;
};

type Click = {
    timestamp: { seconds: number };
}

const processDailyData = (clicks: Click[]) => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const dailyCounts = daysInWeek.map(day => ({
        name: format(day, 'EEE'), // e.g., Mon, Tue
        total: 0
    }));

    clicks.forEach(click => {
        const clickDate = new Date(click.timestamp.seconds * 1000);
        if (clickDate >= weekStart && clickDate <= weekEnd) {
            const dayName = format(clickDate, 'EEE');
            const dayData = dailyCounts.find(d => d.name === dayName);
            if (dayData) {
                dayData.total++;
            }
        }
    });

    return dailyCounts;
};

const processMonthlyData = (clicks: Click[]) => {
    const monthlyCounts = Array.from({ length: 12 }, (_, i) => ({
        name: format(new Date(0, i), 'MMM'), // Jan, Feb, etc.
        total: 0
    }));
    
    const currentYear = getYear(new Date());

    clicks.forEach(click => {
        const clickDate = new Date(click.timestamp.seconds * 1000);
        if(getYear(clickDate) === currentYear) {
            const month = getMonth(clickDate);
            monthlyCounts[month].total++;
        }
    });

    return monthlyCounts;
};

export default function LinkStatsPage() {
    const params = useParams();
    const linkId = params.linkId as string;
    const [linkData, setLinkData] = useState<LinkData | null>(null);
    const [dailyStats, setDailyStats] = useState<any[]>([]);
    const [monthlyStats, setMonthlyStats] = useState<any[]>([]);
    const [sponsorStats, setSponsorStats] = useState<SponsorRule[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!linkId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch link and user data
                const linkRef = doc(db, 'links', linkId);
                const linkSnap = await getDoc(linkRef);

                if (!linkSnap.exists()) {
                    setLinkData(null);
                    setLoading(false);
                    return;
                }

                const data = linkSnap.data();
                const userRef = doc(db, 'users', data.userId);
                const userSnap = await getDoc(userRef);
                const userName = userSnap.exists() ? userSnap.data().displayName : 'Unknown User';
                
                setLinkData({
                    title: data.title,
                    original: data.original,
                    clicks: data.clicks || 0,
                    userName: userName,
                    generatedEarnings: data.generatedEarnings || 0,
                });
                
                // Fetch clicks for stats
                const clicksQuery = query(collection(db, 'clicks'), where('linkId', '==', linkId));
                const clicksSnapshot = await getDocs(clicksQuery);
                const clicksData = clicksSnapshot.docs.map(doc => doc.data() as Click);
                clicksData.sort((a, b) => a.timestamp.seconds - b.timestamp.seconds);

                setDailyStats(processDailyData(clicksData));
                setMonthlyStats(processMonthlyData(clicksData));

                // Fetch sponsors data for this link
                const sponsorsQuery = query(
                    collection(db, 'sponsorRules'), 
                    where('linkId', '==', linkId)
                );
                const sponsorsSnapshot = await getDocs(sponsorsQuery);
                const sponsorsData = sponsorsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as SponsorRule));
                
                setSponsorStats(sponsorsData);


            } catch (error) {
                console.error("Failed to fetch link stats:", error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();

    }, [linkId]);
    
    if (loading) {
        return (
             <div className="flex flex-col gap-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-80" />
                    <Skeleton className="h-80" />
                </div>
            </div>
        );
    }
    
    if(!linkData) {
        return <p>Link not found.</p>
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/admin/links">
                        <ArrowLeft />
                    </Link>
                </Button>
                <h1 className="text-xl sm:text-2xl font-bold truncate">Stats for "{linkData.title}"</h1>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{linkData.clicks.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Clicks after completing all rules.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Created By</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">{linkData.userName}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ingresos generados</CardTitle>
                        <BarChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${linkData.generatedEarnings?.toFixed(4) ?? '0.0000'}</div>
                        <p className="text-xs text-muted-foreground">Total earnings for this link.</p>
                    </CardContent>
                </Card>
            </div>

            {/* Sponsor Statistics Section */}
            {sponsorStats.length > 0 && (
                <>
                    <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-amber-600" />
                        <h2 className="text-lg font-semibold">Sponsor Statistics</h2>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {sponsorStats.map((sponsor) => (
                            <Card key={sponsor.id}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium truncate">{sponsor.title}</CardTitle>
                                    <Target className="h-4 w-4 text-amber-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1">
                                                <Eye className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">Views:</span>
                                            </div>
                                            <span className="font-bold">{sponsor.views || 0}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1">
                                                <MousePointer className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">Clicks:</span>
                                            </div>
                                            <span className="font-bold">{sponsor.clicks || 0}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-muted-foreground">CTR:</span>
                                            <span className="text-xs font-medium">
                                                {sponsor.views > 0 
                                                    ? `${((sponsor.clicks || 0) / sponsor.views * 100).toFixed(1)}%`
                                                    : '0%'
                                                }
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-xs text-muted-foreground">Estado:</span>
                                            {sponsor.isActive ? (
                                                <Badge variant="default" className="bg-green-600">Activo</Badge>
                                            ) : (
                                                <Badge variant="destructive">Inactivo</Badge>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            )}
            
            <div className="grid gap-4 md:grid-cols-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>Daily Clicks</CardTitle>
                        <CardDescription>Clicks over the last 7 days.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <RechartsBarChart data={dailyStats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <Tooltip content={<ClicksTooltip />} />
                                <Bar dataKey="total" fill="hsl(var(--primary))" name="Clicks" />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Monthly Clicks</CardTitle>
                        <CardDescription>Total clicks for each month this year.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <ResponsiveContainer width="100%" height={300}>
                            <RechartsBarChart data={monthlyStats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <Tooltip content={<ClicksTooltip />} />
                                <Bar dataKey="total" fill="hsl(var(--primary))" name="Clicks" />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

        </div>
    );
}
