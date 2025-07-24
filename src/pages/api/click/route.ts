
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, increment, addDoc, serverTimestamp, writeBatch, runTransaction } from 'firebase/firestore';

// Main logic to process a link click
export async function POST(req: NextRequest) {
    try {
        const { shortId } = await req.json();

        if (!shortId) {
            return NextResponse.json({ error: 'shortId is required' }, { status: 400 });
        }
        
        const linksRef = collection(db, 'links');
        const q = query(linksRef, where('shortId', '==', shortId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return NextResponse.json({ error: 'Link not found' }, { status: 404 });
        }

        const linkDoc = querySnapshot.docs[0];
        const linkData = linkDoc.data();
        const linkRef = doc(db, 'links', linkDoc.id);

        const batch = writeBatch(db);

        // This is a "real" visit, so increment the main counters.
        batch.update(linkRef, { clicks: increment(1) });
        
        const clickLogRef = doc(collection(db, 'clicks'));
        const ip = req.headers.get('x-forwarded-for') ?? req.ip ?? 'unknown';

        batch.set(clickLogRef, {
            linkId: linkDoc.id,
            userId: linkData.userId, // Keep track of who owns the link
            timestamp: serverTimestamp(),
            userAgent: req.headers.get('user-agent') || '',
            ip: ip,
        });

        // If the link is monetizable, calculate and update earnings
        if (linkData.monetizable) {
            let activeCpm = 3.00; // Default fallback CPM
            
            // Get the active global CPM rate
            const cpmQuery = query(collection(db, 'cpmHistory'), where('endDate', '==', null));
            const cpmSnapshot = await getDocs(cpmQuery);

            if (!cpmSnapshot.empty) {
                activeCpm = cpmSnapshot.docs[0].data().rate;
            }

            const earningsPerClick = activeCpm / 1000;

            // Increment earnings ON THE LINK DOCUMENT.
            batch.update(linkRef, { generatedEarnings: increment(earningsPerClick) });
        }
        
        await batch.commit();

        return NextResponse.json({ success: true, originalUrl: linkData.original });

    } catch (error) {
        console.error('Error in click handling:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
    }
}
