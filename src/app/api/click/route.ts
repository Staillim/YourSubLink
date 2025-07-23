
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, writeBatch, doc, increment, serverTimestamp } from 'firebase/firestore';
import { parse, serialize } from 'cookie';

export async function POST(req: NextRequest) {
    try {
        const { shortId } = await req.json();
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

        // --- Step 2: Check for visit cookie ---
        const cookies = parse(req.headers.get('cookie') || '');
        const cookieName = `visit_${linkId}`;
        const hasVisitedCookie = !!cookies[cookieName];

        // A "real" click is one from a user who hasn't visited in the last hour.
        const isRealClick = !hasVisitedCookie;

        // --- Step 3: Perform database updates in a batch ---
        const batch = writeBatch(db);
        const linkRef = doc(db, 'links', linkId);
        
        // 3a. Increment total clicks counter on every hit
        batch.update(linkRef, { clicks: increment(1) });
        
        // 3b. If it's a "real" click, increment real counters and handle earnings
        if (isRealClick) {
            batch.update(linkRef, { realClicks: increment(1) });

            if (linkData.monetizable && linkData.userId) {
                // In a real app, this would come from a central config/DB
                // For now, let's assume a fixed CPM
                const activeCpm = 3.00; 
                const earningsPerClick = activeCpm / 1000;
                
                // Increment earnings on both the link and the user document
                batch.update(linkRef, { generatedEarnings: increment(earningsPerClick) });
                const userRef = doc(db, 'users', linkData.userId);
                batch.update(userRef, { generatedEarnings: increment(earningsPerClick) });
            }
        }

        // 3c. Log the click event itself for auditing
        const clickDocRef = doc(collection(db, 'clicks'));
        batch.set(clickDocRef, {
            linkId: linkId,
            timestamp: serverTimestamp(),
            isRealClick: isRealClick,
            source: hasVisitedCookie ? 'cookie' : 'new',
            // Note: IP and user agent could be logged here for more advanced analytics
        });

        await batch.commit();

        // --- Step 4: Prepare and send response ---
        const headers = new Headers();
        
        // If it was a real click, set a cookie to prevent another real click for 1 hour
        if (isRealClick) {
            const cookie = serialize(cookieName, 'true', {
                httpOnly: true,
                secure: process.env.NODE_ENV !== 'development',
                maxAge: 3600, // 1 hour in seconds
                path: '/',
            });
            headers.append('Set-Cookie', cookie);
        }

        const hasRules = linkData.rules && linkData.rules.length > 0;
        if (hasRules) {
            // Tell the client to show the gate page
            return NextResponse.json({ action: 'GATE' }, { headers });
        } else {
            // Tell the client to redirect immediately
            return NextResponse.json({
                action: 'REDIRECT',
                destination: linkData.original,
            }, { headers });
        }

    } catch (error) {
        console.error("Error processing click:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
