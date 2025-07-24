
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, increment, addDoc, serverTimestamp, writeBatch, Timestamp } from 'firebase/firestore';

// Main logic to process a link click securely on the server-side
export async function POST(req: NextRequest) {
    try {
        const { shortId } = await req.json();

        if (!shortId) {
            return NextResponse.json({ error: 'shortId is required' }, { status: 400 });
        }
        
        const ip = req.headers.get('x-forwarded-for') ?? req.ip ?? 'unknown';

        const linksRef = collection(db, 'links');
        const q = query(linksRef, where('shortId', '==', shortId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return NextResponse.json({ error: 'Link not found' }, { status: 404 });
        }

        const linkDoc = querySnapshot.docs[0];
        const linkData = linkDoc.data();
        const linkId = linkDoc.id;

        // Anti-spam check: Look for a recent click from the same IP for the same link
        const oneHourAgo = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
        const clicksRef = collection(db, 'clicks');
        const recentClickQuery = query(
            clicksRef,
            where('linkId', '==', linkId),
            where('ip', '==', ip),
            where('timestamp', '>=', oneHourAgo)
        );

        const recentClickSnapshot = await getDocs(recentClickQuery);

        if (!recentClickSnapshot.empty) {
            // A recent click from this IP already exists, so we don't count it again.
            // We still redirect the user, just without incrementing the count.
            return NextResponse.json({ success: true, message: 'Already counted', originalUrl: linkData.original });
        }

        // If no recent click is found, proceed to count it.
        const linkRef = doc(db, 'links', linkId);
        const batch = writeBatch(db);

        // 1. This is a "real" visit, so increment the main counters.
        batch.update(linkRef, { clicks: increment(1) });
        
        // 2. Add a detailed record of this click.
        const clickLogRef = doc(collection(db, 'clicks'));
        const clickLogData: any = {
            linkId: linkId,
            userId: linkData.userId,
            timestamp: serverTimestamp(),
            userAgent: req.headers.get('user-agent') || '',
            ip: ip,
        };

        // 3. If the link is monetizable, calculate and update earnings.
        if (linkData.monetizable) {
            let activeCpm = 3.00; // Default fallback CPM
            let activeCpmId = null;
            
            // Get the active global CPM rate
            const cpmQuery = query(collection(db, 'cpmHistory'), where('endDate', '==', null));
            const cpmSnapshot = await getDocs(cpmQuery);

            if (!cpmSnapshot.empty) {
                const cpmDoc = cpmSnapshot.docs[0];
                activeCpmId = cpmDoc.id;
                activeCpm = cpmDoc.data().rate;
            }

            const earningsPerClick = activeCpm / 1000;

            // Increment earnings ON THE LINK DOCUMENT.
            batch.update(linkRef, { generatedEarnings: increment(earningsPerClick) });

            // Add earnings info to the click log
            clickLogData.earnings = earningsPerClick;
            clickLogData.cpmHistoryId = activeCpmId;
        }
        
        batch.set(clickLogRef, clickLogData);
        await batch.commit();

        return NextResponse.json({ success: true, originalUrl: linkData.original });

    } catch (error) {
        console.error('Error in click handling:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
    }
}
