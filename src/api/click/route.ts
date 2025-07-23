
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
            const userSnap = await getDoc(userRef);
            let earningsPerClick = 0;
            let activeCpmId = 'default';

            // Check for a custom user CPM first. Check should be for not null or undefined.
            if (userSnap.exists() && userSnap.data().customCpm != null) {
                 earningsPerClick = userSnap.data().customCpm / 1000;
                 activeCpmId = `user_${linkData.userId}`; // Custom ID for user-specific CPM earnings
            } else {
                // Fallback to global CPM
                const cpmQuery = query(collection(db, 'cpmHistory'), where('endDate', '==', null));
                const cpmSnapshot = await getDocs(cpmQuery);
                let activeCpm = 3.00; // Default fallback CPM

                if (!cpmSnapshot.empty) {
                    const cpmDoc = cpmSnapshot.docs[0];
                    activeCpm = cpmDoc.data().rate;
                    activeCpmId = cpmDoc.id;
                }
                earningsPerClick = activeCpm / 1000;
            }

            batch.update(userRef, { generatedEarnings: increment(earningsPerClick) });
            // Also update the earnings on the link itself for stats
            batch.update(linkRef, { generatedEarnings: increment(earningsPerClick) });
            
            // And update the earnings for the specific CPM period on the link
            const cpmEarningsField = `earningsByCpm.${activeCpmId}`;
            batch.update(linkRef, { [cpmEarningsField]: increment(earningsPerClick) });
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
