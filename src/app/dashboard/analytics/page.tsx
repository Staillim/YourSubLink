

'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/use-user';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, getDocs, orderBy } from 'firebase/firestore';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { DollarSign, Eye, ArrowUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { LinkItem } from '../page';
import { format, getMonth, getYear } from 'date-fns';

const chartConfig = {
  earnings: {
    label: 'Earnings',
    color: 'hsl(var(--primary))',
  },
};

type CpmHistory = {
    rate: number;
    startDate: { seconds: number };
    endDate?: { seconds: number };
};


export default function AnalyticsPage() {
  const { user, profile, loading } = useUser();
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [cpmHistory, setCpmHistory] = useState<CpmHistory[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);

  // States to track individual data loads
  const [linksDataLoaded, setLinksDataLoaded] = useState(false);
  const [cpmDataLoaded, setCpmDataLoaded] = useState(false);


  useEffect(() => {
    if (user) {
      setLinksLoading(true);
      setLinksDataLoaded(false);
      setCpmDataLoaded(false);

      const linksQuery = query(collection(db, "links"), where("userId", "==", user.uid));
      const cpmQuery = query(collection(db, 'cpmHistory'), orderBy('startDate', 'desc'));

      const unsubLinks = onSnapshot(linksQuery, (querySnapshot) => {
        const linksData: LinkItem[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          linksData.push({
            id: doc.id,
            original: data.original,
            shortId: data.shortId,
            short: `${window.location.origin}/link/${data.shortId}`,
            clicks: data.clicks,
            date: new Date(data.createdAt.seconds * 1000).toISOString(),
            userId: data.userId,
            title: data.title,
            description: data.description,
            monetizable: data.monetizable || false,
            rules: data.rules || [],
            generatedEarnings: data.generatedEarnings || 0,
            monetizationStatus: data.monetizationStatus || 'active'
          });
        });
        setLinks(linksData);
        setLinksDataLoaded(true);
      });
      
      const unsubCpm = onSnapshot(cpmQuery, (snapshot) => {
          const historyData: CpmHistory[] = snapshot.docs.map(doc => doc.data() as CpmHistory);
          setCpmHistory(historyData);
          setCpmDataLoaded(true);
      });
      
      return () => {
        unsubLinks();
        unsubCpm();
      }
    } else if (!loading) {
        setLinksLoading(false);
    }
  }, [user, loading]);
  
  useEffect(() => {
    // We combine the main user loading state with the specific data loading states
    if (!loading && linksDataLoaded && cpmDataLoaded) {
      setLinksLoading(false);
    }
  }, [loading, linksDataLoaded, cpmDataLoaded]);

  const totalClicks = links.reduce((acc, link) => acc + link.clicks, 0);
  const totalEarnings = links.reduce((acc, link) => acc + (link.generatedEarnings || 0), 0);
  
  // Determine the active CPM to display
  const globalActiveCpm = cpmHistory.find(c => !c.endDate)?.rate || 0;
  const activeCpm = profile?.customCpm != null ? profile.customCpm : globalActiveCpm;
  
  const hasCustomCpm = profile?.customCpm != null;

  const getMonthlyChartData = () => {
    const monthlyEarnings: { [key: string]: number } = {};
    const now = new Date();
    const currentYear = getYear(now);
    const currentMonth = getMonth(now);

    links.forEach(link => {
        if (getYear(new Date(link.date)) === currentYear && link.generatedEarnings > 0) {
            const month = getMonth(new Date(link.date));
            const key = `${currentYear}-${month}`;
            
            if (monthlyEarnings[key]) {
                monthlyEarnings[key] += link.generatedEarnings;
            } else {
                monthlyEarnings[key] = link.generatedEarnings;
            }
        }
    });

    return Array.from({ length: currentMonth + 1 }, (_, i) => {
        const monthName = format(new Date(currentYear, i), 'MMMM');
        const key = `${currentYear}-${i}`;
        return {
            month: monthName,
            earnings: monthlyEarnings[key] || 0
        };
    });
  }
  
  const linksWithEarnings = links.map(link => ({
      ...link,
      earnings: link.generatedEarnings || 0
  })).sort((a,b) => b.earnings - a.earnings);


  if (loading || linksLoading) {
      return (
        <>
            <div className="flex items-center">
                <h1 className="text-lg font-semibold md:text-2xl">Analytics</h1>
            </div>
            <div className="grid gap-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                </div>
                <Skeleton className="h-80" />
                <Skeleton className="h-80" />
            </div>
        </>
      )
  }

  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Analytics</h1>
      </div>
      <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">${totalEarnings.toFixed(4)}</div>
                      <p className="text-xs text-muted-foreground">Based on total monetizable clicks</p>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                       <Eye className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">+{totalClicks.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Across all your links</p>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active CPM</CardTitle>
                       <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">${activeCpm.toFixed(4)}</div>
                      {hasCustomCpm ? (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                           <ArrowUp className="h-3 w-3 text-green-500"/>
                           <span>Your custom rate is active (Global: ${globalActiveCpm.toFixed(4)})</span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Current global rate per 1000 views</p>
                      )}
                  </CardContent>
              </Card>
          </div>
        <Card>
          <CardHeader>
            <CardTitle>Monthly Earnings Overview</CardTitle>
            <CardDescription>
              Earnings from monetized clicks this year.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
              <BarChart
                accessibilityLayer
                data={getMonthlyChartData()}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <YAxis tickFormatter={(value) => `$${Number(value).toFixed(4)}`} />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(value) => `$${Number(value).toFixed(4)}`} />}
                />
                <Bar dataKey="earnings" fill="var(--color-earnings)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Links Breakdown</CardTitle>
                <CardDescription>Detailed statistics for each of your links.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Link</TableHead>
                          <TableHead className="hidden text-right sm:table-cell">Clicks</TableHead>
                          <TableHead className="hidden text-right sm:table-cell">Generated Earnings</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {linksWithEarnings.map((link) => (
                           <TableRow key={link.id}>
                              <TableCell className="font-medium">
                                <span className="font-bold">{link.title}</span>
                                <div className="sm:hidden mt-2 space-y-1 text-xs text-muted-foreground">
                                    <div className="flex items-center justify-between">
                                        <span>Clicks:</span>
                                        <span className="font-mono text-foreground">{link.clicks.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Earnings:</span>
                                        <span className="font-mono font-semibold text-green-500">${link.earnings.toFixed(4)}</span>
                                    </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden text-right sm:table-cell">{link.clicks.toLocaleString()}</TableCell>
                              <TableCell className="hidden text-right font-semibold text-green-500 sm:table-cell">${link.earnings.toFixed(4)}</TableCell>
                           </TableRow>
                      ))}
                      {links.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                No links created yet.
                            </TableCell>
                        </TableRow>
                      )}
                  </TableBody>
              </Table>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
