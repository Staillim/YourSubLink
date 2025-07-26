
'use server';
/**
 * @fileOverview A backend flow to securely process clicks and calculate earnings.
 * 
 * - calculateEarnings - A function that processes unprocessed clicks and updates earnings.
 * - CalculateEarningsOutput - The return type for the calculateEarnings function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, writeBatch, Timestamp, getDoc, serverTimestamp, increment } from 'firebase/firestore';
import type { MonetizationPeriod, LinkData } from '@/types';

const CalculateEarningsOutputSchema = z.object({
  processedClicks: z.number().describe("The number of clicks that were processed."),
  totalEarnings: z.number().describe("The total earnings generated from these clicks."),
});
export type CalculateEarningsOutput = z.infer<typeof CalculateEarningsOutputSchema>;


export async function calculateEarnings(): Promise<CalculateEarningsOutput> {
  return calculateEarningsFlow();
}

const calculateEarningsFlow = ai.defineFlow(
  {
    name: 'calculateEarningsFlow',
    outputSchema: CalculateEarningsOutputSchema,
  },
  async () => {
    
    // 1. Fetch all unprocessed clicks
    const clicksQuery = query(
      collection(db, 'clicks'),
      where('processed', '==', false)
    );
    const clicksSnapshot = await getDocs(clicksQuery);

    if (clicksSnapshot.empty) {
      return { processedClicks: 0, totalEarnings: 0 };
    }

    let processedClicks = 0;
    let totalEarnings = 0;
    const batch = writeBatch(db);

    for (const clickDoc of clicksSnapshot.docs) {
      const clickData = clickDoc.data();
      const linkId = clickData.linkId;
      const clickTimestamp = clickData.timestamp as Timestamp;
      const userId = clickData.userId;

      if (!linkId || !clickTimestamp || !userId) {
        // Mark as processed to avoid re-querying invalid data
        batch.update(clickDoc.ref, { processed: true, earningsGenerated: 0, reason: "Missing linkId, userId, or timestamp" });
        continue;
      }
      
      const linkRef = doc(db, 'links', linkId);
      const linkSnap = await getDoc(linkRef);

      if (!linkSnap.exists()) {
        batch.update(clickDoc.ref, { processed: true, earningsGenerated: 0, reason: "Link not found" });
        continue;
      }
      
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists() || userSnap.data().accountStatus === 'suspended') {
        batch.update(clickDoc.ref, { processed: true, earningsGenerated: 0, reason: "User not found or suspended" });
        continue;
      }

      const linkData = linkSnap.data() as LinkData;
      const userData = userSnap.data();

      let earningsForThisClick = 0;
      const hasEnoughRules = linkData.rules && linkData.rules.length >= 3;

      if (hasEnoughRules) {
        let cpmUsed = 0;
        const customCpm = userData?.customCpm;

        if (customCpm && customCpm > 0) {
            cpmUsed = customCpm;
        } else {
            const cpmQuery = query(collection(db, 'cpmHistory'), where('endDate', '==', null));
            const cpmSnapshot = await getDocs(cpmQuery);
            if (!cpmSnapshot.empty) {
                cpmUsed = cpmSnapshot.docs[0].data().rate;
            } else {
                cpmUsed = 3.00; // Default fallback CPM
            }
        }
        
        earningsForThisClick = cpmUsed / 1000;
        totalEarnings += earningsForThisClick;
        batch.update(linkRef, { generatedEarnings: increment(earningsForThisClick) });
      }

      batch.update(clickDoc.ref, { 
        processed: true, 
        earningsGenerated: earningsForThisClick,
        processedAt: serverTimestamp(),
        cpmUsed: hasEnoughRules ? (userData?.customCpm || (await getDocs(query(collection(db, 'cpmHistory'), where('endDate', '==', null)))).docs[0]?.data().rate || 3.00) : 0,
      });
      processedClicks++;
    }

    await batch.commit();

    return { processedClicks, totalEarnings };
  }
);
