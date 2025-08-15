"use client";

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import UserAdminActions from './UserAdminActions';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, BarChart3, ExternalLink, Eye, Calendar } from 'lucide-react';
import type { LinkData } from '@/types';
import { useEffect, useState } from 'react';

export default function UserDetailClient({ user, userId, links, totalEarnings }: {
  user: any;
  userId: string;
  links: LinkData[];
  totalEarnings: number;
}) {
  const [sponsorCounts, setSponsorCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    // Cargar sponsors para cada link
    async function fetchSponsorCounts() {
      const counts: Record<string, number> = {};
      for (const link of links) {
        try {
          const res = await fetch(`/api/sponsors/count?linkId=${link.id}`);
          const data = await res.json();
          counts[link.id] = data.count || 0;
        } catch {
          counts[link.id] = 0;
        }
      }
      setSponsorCounts(counts);
    }
    fetchSponsorCounts();
  }, [links]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Usuario: {user.displayName || user.email}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-2 text-sm text-muted-foreground">Email: {user.email}</div>
          <div className="mb-2 text-sm">Rol: <Badge>{user.role}</Badge></div>
          <div className="mb-2 text-sm">Estado: <Badge variant={user.accountStatus === 'active' ? 'default' : 'destructive'}>{user.accountStatus}</Badge></div>
          <div className="mb-2 text-sm">Ingresos totales: <span className="font-bold">${totalEarnings.toFixed(4)}</span></div>
          {user.role !== 'admin' && (
            <UserAdminActions userId={userId} accountStatus={user.accountStatus} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Links del usuario</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left">Título</th>
                  <th className="text-left">Clicks</th>
                  <th className="text-left">Ingresos</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link, idx) => (
                  <tr key={link.id} className={idx !== links.length - 1 ? 'border-b border-muted' : ''}>
                    <td className="max-w-[220px] truncate">
                      <div className="font-semibold truncate max-w-[200px] sm:max-w-xs">{link.title}</div>
                      <Link href={`/${link.shortId}`} target="_blank" className="text-xs text-muted-foreground hover:underline block truncate max-w-[200px] sm:max-w-xs">
                        {`${process.env.NEXT_PUBLIC_SITE_URL || ''}/${link.shortId}`}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap flex items-center gap-1"><Eye className="h-4 w-4 text-muted-foreground" />{link.clicks ?? 0}</td>
                    <td>${(link.generatedEarnings || 0).toFixed(4)}</td>
                    <td className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => window.open(`/admin/links/${link.id}`, '_blank')}>
                            <BarChart3 className="mr-2 h-4 w-4" />
                            <span>Ver estadísticas</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.open(`/${link.shortId}`, '_blank')}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            <span>Ver enlace</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
