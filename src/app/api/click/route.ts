
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, writeBatch, doc, increment, serverTimestamp } from 'firebase/firestore';

export async function POST(req: NextRequest) {
    try {
        const { shortId, isRealVisit } = await req.json();

        if (!shortId) {
            return NextResponse.json({ error: 'shortId is required' }, { status: 400 });
        }

        // --- Step 1: Find the link document ---
        const linksCollection = collection(db, 'links');
        const q = query(linksCollection, where('shortId', '==', shortId));
        const linksSnapshot = await getDocs(q);

        if (linksSnapshot.empty) {
            return NextResponse.json({ error: 'Link not found' }, { status: 404 });
        }

        const linkDoc = linksSnapshot.docs[0];
        const linkId = linkDoc.id;
        const linkData = linkDoc.data();

        // --- Step 2: Perform database updates in a batch ---
        const batch = writeBatch(db);
        const linkRef = doc(db, 'links', linkId);

        // Always increment total clicks
        batch.update(linkRef, { clicks: increment(1) });
        
        // If the client determined it's a real visit, increment real counters
        if (isRealVisit) {
            batch.update(linkRef, { realClicks: increment(1) });

            // Handle earnings only on real visits
            if (linkData.monetizable && linkData.userId) {
                // In a real app, this would come from a central config/DB
                const activeCpm = 3.00;
                const earningsPerClick = activeCpm / 1000;

                batch.update(linkRef, { generatedEarnings: increment(earningsPerClick) });
                const userRef = doc(db, 'users', linkData.userId);
                batch.update(userRef, { generatedEarnings: increment(earningsPerClick) });
            }
        }
        
        // Log the click event for auditing
        const clickDocRef = doc(collection(db, 'clicks'));
        batch.set(clickDocRef, {
            linkId: linkId,
            timestamp: serverTimestamp(),
            isRealClick: isRealVisit,
            source: 'client-storage', // Mark that client localStorage was the source of truth
        });

        await batch.commit();

        // --- Step 3: Respond to client with next action ---
        const responsePayload = {
            link: {
                ...linkData,
                id: linkId,
            },
            action: (linkData.rules && linkData.rules.length > 0) ? 'GATE' : 'REDIRECT',
        };
        
        return NextResponse.json(responsePayload, { status: 200 });

    } catch (error) {
        console.error("Error processing click:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
