
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, writeBatch, doc, increment, serverTimestamp } from 'firebase/firestore';

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

        // This is now the single point of counting. We increment total clicks.
        batch.update(linkRef, { clicks: increment(1) });
        
        // If the link is monetizable, we also calculate earnings based on this click.
        if (linkData.monetizable && linkData.userId) {
            const userRef = doc(db, 'users', linkData.userId);
            const cpmQuery = query(collection(db, 'cpmHistory'), where('endDate', '==', null));
            const cpmSnapshot = await getDocs(cpmQuery);
            let activeCpm = 3.00; // Default fallback CPM
            let activeCpmId = 'default';

            if (!cpmSnapshot.empty) {
                const cpmDoc = cpmSnapshot.docs[0];
                activeCpm = cpmDoc.data().rate;
                activeCpmId = cpmDoc.id;
            }

            const earningsPerClick = activeCpm / 1000;
            batch.update(userRef, { generatedEarnings: increment(earningsPerClick) });
            batch.update(linkRef, { generatedEarnings: increment(earningsPerClick) });
            
            const cpmEarningsField = `earningsByCpm.${activeCpmId}`;
            batch.update(linkRef, { [cpmEarningsField]: increment(earningsPerClick) });
        }
        
        const clickDocRef = doc(collection(db, 'clicks'));
        batch.set(clickDocRef, {
            linkId: linkId,
            timestamp: serverTimestamp(),
            // This field is kept for historical/debugging purposes but is no longer central to logic
            isRealClick: true, 
        });

        await batch.commit();
        
        // Fetch the updated data to return to client
        const updatedLinkSnap = await getDoc(linkRef);
        const updatedLinkData = updatedLinkSnap.data();

        const responsePayload = {
            link: {
                ...updatedLinkData,
                id: linkId,
            },
            // The action is now determined by whether rules exist or not.
            action: (linkData.rules && linkData.rules.length > 0) ? 'GATE' : 'REDIRECT',
        };
        
        return NextResponse.json(responsePayload, { status: 200 });

    } catch (error) {
        console.error("Error processing click:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
