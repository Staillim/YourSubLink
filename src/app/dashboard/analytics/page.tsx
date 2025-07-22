
'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
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
import { ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { LinkItem } from '../page';
import { format, getMonth, getYear } from 'date-fns';


const chartConfig = {
  earnings: {
    label: 'Earnings',
    color: 'hsl(var(--primary))',
  },
};

const CPM = 3.00;

export default function AnalyticsPage() {
  const [user, loading] = useAuthState(auth);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setLinksLoading(true);
      const q = query(collection(db, "links"), where("userId", "==", user.uid));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const linksData: LinkItem[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          linksData.push({
            id: doc.id,
            original: data.original,
            shortId: data.shortId,
            short: `${window.location.origin}/${data.shortId}`,
            clicks: data.clicks,
            date: new Date(data.createdAt.seconds * 1000).toISOString(),
            userId: data.userId,
            title: data.title,
            description: data.description,
            monetizable: data.monetizable || false,
            rules: data.rules || [],
            generatedEarnings: data.generatedEarnings || 0,
          });
        });
        setLinks(linksData);
        setLinksLoading(false);
      });

      return () => unsubscribe();
    } else if (!loading) {
        setLinksLoading(false);
    }
  }, [user, loading]);

  const totalClicks = links.reduce((acc, link) => acc + link.clicks, 0);
  const totalEarnings = links.reduce((acc, link) => acc + (link.monetizable ? (link.clicks / 1000) * CPM : 0), 0);

  const getChartData = () => {
    const monthlyEarnings: { [key: string]: number } = {};

    links.forEach(link => {
        if (link.clicks > 0 && link.monetizable) {
            const date = new Date(link.date);
            const year = getYear(date);
            const month = getMonth(date);
            const monthKey = `${year}-${month}`;
            const earnings = (link.clicks / 1000) * CPM;
            
            if (monthlyEarnings[monthKey]) {
                monthlyEarnings[monthKey] += earnings;
            } else {
                monthlyEarnings[monthKey] = earnings;
            }
        }
    });

    const currentYear = getYear(new Date());
    const chartData = Array.from({ length: 12 }, (_, i) => {
        const monthName = format(new Date(currentYear, i), 'MMMM');
        const key = `${currentYear}-${i}`;
        return {
            month: monthName,
            earnings: monthlyEarnings[key] || 0
        };
    });
    
    return chartData;
  }
  
  const linksWithEarnings = links.map(link => ({
      ...link,
      earnings: link.monetizable ? (link.clicks / 1000) * CPM : 0
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
                      <span className="text-sm text-muted-foreground">$</span>
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">${totalEarnings.toFixed(2)}</div>
                      <p className="text-xs text-muted-foreground">Based on total monetizable clicks</p>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                       <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">+{totalClicks.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Across all links</p>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Average CPM</CardTitle>
                       <span className="text-sm text-muted-foreground">$</span>
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">${CPM.toFixed(2)}</div>
                      <p className="text-xs text-muted-foreground">Fixed rate per 1000 monetized views</p>
                  </CardContent>
              </Card>
          </div>
          <Card>
          <CardHeader>
            <CardTitle>Earnings Overview</CardTitle>
            <CardDescription>Earnings from monetized clicks this year.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
              <BarChart accessibilityLayer data={getChartData()}>
                 <CartesianGrid vertical={false} />
                 <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => `$${Number(value).toFixed(2)}`} />} />
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
                          <TableHead className="text-right">Clicks</TableHead>
                          <TableHead className="text-right">Estimated Earnings</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {linksWithEarnings.map((link) => (
                           <TableRow key={link.id}>
                              <TableCell className="font-medium">{link.title}</TableCell>
                              <TableCell className="text-right">{link.clicks.toLocaleString()}</TableCell>
                              <TableCell className="text-right">${link.earnings.toFixed(2)}</TableCell>
                           </TableRow>
                      ))}
                      {links.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">
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
