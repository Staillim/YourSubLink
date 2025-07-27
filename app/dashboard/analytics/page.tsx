'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, getDocs, orderBy, doc, getDoc } from 'firebase/firestore'; // Agregado getDoc y doc
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
import { ExternalLink, DollarSign, Eye, ArrowUp } from 'lucide-react'; // Agregado ArrowUp
import { Skeleton } from '@/components/ui/skeleton';
import type { LinkItem } from '../page';
import { format, getMonth, getYear } from 'date-fns';

const chartConfig = {
  earnings: {
    label: 'Earnings',
    color: 'hsl(var(--primary))',
  },
};

// Definir tipo para el perfil del usuario
type UserProfile = {
  customCpm?: number | null;
};

type CpmHistory = {
  rate: number;
  startDate: { seconds: number };
  endDate?: { seconds: number };
};

export default function AnalyticsPage() {
  const [user, loading] = useAuthState(auth);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [cpmHistory, setCpmHistory] = useState<CpmHistory[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null); // Estado para el perfil del usuario
  const [linksDataLoaded, setLinksDataLoaded] = useState(false);
  const [cpmDataLoaded, setCpmDataLoaded] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false); // Estado para la carga del perfil

  useEffect(() => {
    if (user) {
      setLinksLoading(true);
      setLinksDataLoaded(false);
      setCpmDataLoaded(false);
      setProfileLoaded(false);

      // Consultar el perfil del usuario
      const fetchProfile = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
            setProfile({});
          }
          setProfileLoaded(true);
        } catch (error) {
          console.error('Error al obtener el perfil:', error);
          setProfile({});
          setProfileLoaded(true);
        }
      };

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

      fetchProfile();
      
      return () => {
        unsubLinks();
        unsubCpm();
      }
    } else if (!loading) {
      setLinksLoading(false);
    }
  }, [user, loading]);
  
  useEffect(() => {
    if (linksDataLoaded && cpmDataLoaded && profileLoaded) {
      setLinksLoading(false);
    }
  }, [linksDataLoaded, cpmDataLoaded, profileLoaded]); // Agregado profileLoaded

  const totalClicks = links.reduce((acc, link) => acc + link.clicks, 0);
  const totalEarnings = links.reduce((acc, link) => acc + (link.generatedEarnings || 0), 0);
  
  // Determinar el CPM activo
  const globalActiveCpm = cpmHistory.find(c => !c.endDate)?.rate || 0;
  const activeCpm = profile?.customCpm !== null && profile?.customCpm !== undefined ? profile.customCpm : globalActiveCpm;
  const hasCustomCpm = profile?.customCpm !== null && profile?.customCpm !== undefined;

  const getMonthlyChartData = () => {
    const monthlyEarnings: { [key: string]: number } = {};
    const now = new Date();
    const currentYear = getYear(now);
    const currentMonth = getMonth(now);

    links.forEach(link => {
      if (getYear(new Date(link.date)) === currentYear && link.generatedEarnings > 0) {
        const month = getMonth(new Date(link.date));
        const monthKey = `${currentYear}-${month}`;
        
        if (monthlyEarnings[monthKey]) {
          monthlyEarnings[monthKey] += link.generatedEarnings;
        } else {
          monthlyEarnings[monthKey] = link.generatedEarnings;
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
              <p className="text-xs text-muted-foreground">Across all links</p>
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
                  <span>Tu tasa personalizada está activa (Global: ${globalActiveCpm.toFixed(4)})</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Tasa global actual por 1000 vistas monetizadas</p>
              )}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Resumen de Ingresos Mensuales</CardTitle>
            <CardDescription>
              Ingresos de clics monetizados este año.
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
            <CardTitle>Desglose de Enlaces</CardTitle>
            <CardDescription>Estadísticas detalladas de cada uno de tus enlaces.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Enlace</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Clics</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Ingresos Generados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linksWithEarnings.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell className="font-medium">
                      <span className="font-bold">{link.title}</span>
                      <div className="sm:hidden mt-2 space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <span>Clics:</span>
                          <span className="font-mono text-foreground">{link.clicks.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Ingresos:</span>
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
                      No se han creado enlaces aún.
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
};