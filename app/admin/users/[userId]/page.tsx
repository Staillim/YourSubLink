
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import type { LinkData } from '@/types';
import UserDetailClient from './UserDetailClient';

export default async function AdminUserDetailPage({ params }: { params: { userId: string } }) {
  const userId = params.userId;

  // Obtener datos del usuario
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (!userDoc.exists()) return notFound();
  const userRaw = userDoc.data();
  // Serializar campos tipo Timestamp (como createdAt)
  const user = {
    ...userRaw,
    createdAt: userRaw.createdAt && typeof userRaw.createdAt === 'object' && 'seconds' in userRaw.createdAt
      ? userRaw.createdAt.seconds
      : userRaw.createdAt,
  };

  // Obtener links del usuario
  const linksQuery = query(collection(db, 'links'), where('userId', '==', userId));
  const linksSnap = await getDocs(linksQuery);
  const links = linksSnap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt && typeof data.createdAt === 'object' && 'seconds' in data.createdAt
        ? data.createdAt.seconds
        : data.createdAt,
    };
  }) as unknown as LinkData[];

  // Calcular ingresos totales
  const totalEarnings = links.reduce((sum, link) => sum + (link.generatedEarnings || 0), 0);


  return (
    <UserDetailClient user={user} userId={userId} links={links} totalEarnings={totalEarnings} />
  );
}
