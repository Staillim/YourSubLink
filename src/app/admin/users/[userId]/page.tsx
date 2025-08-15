
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, BarChart3, ExternalLink } from 'lucide-react';
import type { LinkData } from '@/types';

export default async function AdminUserDetailPage({ params }: { params: { userId: string } }) {
  const userId = params.userId;

  // Obtener datos del usuario
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (!userDoc.exists()) return notFound();
  const user = userDoc.data();

  // Obtener links del usuario
  const linksQuery = query(collection(db, 'links'), where('userId', '==', userId));
  const linksSnap = await getDocs(linksQuery);
  const links = linksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LinkData[];

  // Calcular ingresos totales
  const totalEarnings = links.reduce((sum, link) => sum + (link.generatedEarnings || 0), 0);

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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Links del usuario</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">Título</th>
                <th className="text-left">Enlace acortado</th>
                <th className="text-left">Ingresos</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {links.map(link => (
                <tr key={link.id}>
                  <td>{link.title}</td>
                  <td>
                    <Link href={`/${link.shortId}`} target="_blank" className="text-blue-600 hover:underline">
                      {`${process.env.NEXT_PUBLIC_SITE_URL || ''}/${link.shortId}`}
                    </Link>
                  </td>
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
                        {/* Aquí puedes agregar más acciones si lo deseas */}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
