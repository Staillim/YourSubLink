"use client";
import { useEffect, useState } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AdminReferralsPage() {
  const [referralStats, setReferralStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReferrals() {
      setLoading(true);
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Map: referralCode => [users invited]
      const referralMap = {};
      users.forEach(user => {
        if (user.referrerId) {
          if (!referralMap[user.referrerId]) referralMap[user.referrerId] = [];
          referralMap[user.referrerId].push(user);
        }
      });
      // Build stats: for each user, how many invited and who
      const stats = users.map(user => ({
        id: user.id,
        displayName: user.displayName || user.email || user.id,
        referralCode: user.referralCode,
        invitedCount: referralMap[user.referralCode]?.length || 0,
        invited: referralMap[user.referralCode] || [],
      })).sort((a, b) => b.invitedCount - a.invitedCount);
      setReferralStats(stats);
      setLoading(false);
    }
    fetchReferrals();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Ranking de Referidos</h1>
      {loading ? (
        <div>Cargando...</div>
      ) : (
        <table className="min-w-full border text-sm">
          <thead>
            <tr>
              <th className="border px-2 py-1">Usuario</th>
              <th className="border px-2 py-1">Código de referido</th>
              <th className="border px-2 py-1">Invitados</th>
              <th className="border px-2 py-1">Lista de Invitados</th>
            </tr>
          </thead>
          <tbody>
            {referralStats.map(user => (
              <tr key={user.id}>
                <td className="border px-2 py-1">{user.displayName}</td>
                <td className="border px-2 py-1">{user.referralCode}</td>
                <td className="border px-2 py-1 text-center">{user.invitedCount}</td>
                <td className="border px-2 py-1">
                  {user.invited.length === 0 ? (
                    <span className="text-gray-400">Ninguno</span>
                  ) : (
                    <ul className="list-disc ml-4">
                      {user.invited.map(invited => (
                        <li key={invited.id}>{invited.displayName || invited.email || invited.id}</li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
