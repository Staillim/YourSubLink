
'use client';

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

const chartData = [
    { month: 'January', earnings: 186 },
    { month: 'February', earnings: 305 },
    { month: 'March', earnings: 237 },
    { month: 'April', earnings: 73 },
    { month: 'May', earnings: 209 },
    { month: 'June', earnings: 214 },
];

const chartConfig = {
  earnings: {
    label: 'Earnings',
    color: 'hsl(var(--primary))',
  },
};

const linksData = [
    { id: '1', title: 'My Awesome YouTube Channel', clicks: 1203, earnings: 3.61 },
    { id: '2', title: 'Instagram Giveaway Post', clicks: 842, earnings: 2.53 },
    { id: '3', title: 'New TikTok Dance Video', clicks: 2345, earnings: 7.04 },
    { id: '4', title: 'Visit my cool website', clicks: 451, earnings: 1.35 },
];

export default function AnalyticsPage() {
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
                      <div className="text-2xl font-bold">$14.53</div>
                      <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                       <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">+4841</div>
                      <p className="text-xs text-muted-foreground">+180.1% from last month</p>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Average CPM</CardTitle>
                       <span className="text-sm text-muted-foreground">$</span>
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">$3.00</div>
                      <p className="text-xs text-muted-foreground">Fixed rate per 1000 monetized views</p>
                  </CardContent>
              </Card>
          </div>
          <Card>
          <CardHeader>
            <CardTitle>Earnings Overview</CardTitle>
            <CardDescription>January - June 2024</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
              <BarChart accessibilityLayer data={chartData}>
                 <CartesianGrid vertical={false} />
                 <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
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
                      {linksData.map((link) => (
                           <TableRow key={link.id}>
                              <TableCell className="font-medium">{link.title}</TableCell>
                              <TableCell className="text-right">{link.clicks.toLocaleString()}</TableCell>
                              <TableCell className="text-right">${link.earnings.toFixed(2)}</TableCell>
                           </TableRow>
                      ))}
                  </TableBody>
              </Table>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
