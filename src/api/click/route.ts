
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, writeBatch, doc, increment, serverTimestamp, getDoc } from 'firebase/firestore';

export async function POST(req: NextRequest) {
    try {
        const { shortId } = await req.json();

        if (!shortId) {
            return NextResponse.json({ error: 'shortId is required' }, { status: 400 });
        }

        const linksCollection = collection(db, 'links');
        const q = query(linksCollection, where('shortId', '==', shortId));
        const linksSnapshot = await getDocs(q);

        if (linksSnapshot.empty) {
            return NextResponse.json({ error: 'Link not found' }, { status: 404 });
        }

        const linkDoc = linksSnapshot.docs[0];
        const linkId = linkDoc.id;
        const linkData = linkDoc.data();

        const batch = writeBatch(db);
        const linkRef = doc(db, 'links', linkId);

        // Always increment the total clicks counter.
        batch.update(linkRef, { clicks: increment(1) });
        
        // If the link is monetizable, we also calculate earnings based on this click.
        if (linkData.monetizable && linkData.userId) {
            const userRef = doc(db, 'users', linkData.userId);
            
            // Use the global CPM for all calculations.
            const cpmQuery = query(collection(db, 'cpmHistory'), where('endDate', '==', null));
            const cpmSnapshot = await getDocs(cpmQuery);
            let activeCpm = 3.00; // Default fallback CPM in case nothing is set
            let activeCpmId = 'default';
            let earningsPerClick = 0;

            if (!cpmSnapshot.empty) {
                const cpmDoc = cpmSnapshot.docs[0];
                activeCpm = cpmDoc.data().rate;
                activeCpmId = cpmDoc.id;
            }
            earningsPerClick = activeCpm / 1000;
            

            if (earningsPerClick > 0) {
                batch.update(userRef, { generatedEarnings: increment(earningsPerClick) });
                // Also update the earnings on the link itself for stats
                batch.update(linkRef, { generatedEarnings: increment(earningsPerClick) });
                
                // And update the earnings for the specific CPM period on the link
                const cpmEarningsField = `earningsByCpm.${activeCpmId}`;
                batch.update(linkRef, { [cpmEarningsField]: increment(earningsPerClick) });
            }
        }
        
        // Create a historical record of the click for analytics.
        const clickDocRef = doc(collection(db, 'clicks'));
        batch.set(clickDocRef, {
            linkId: linkId,
            timestamp: serverTimestamp(),
        });

        await batch.commit();
        
        return NextResponse.json({ message: 'Click processed successfully' }, { status: 200 });

    } catch (error) {
        console.error("Error processing click:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
