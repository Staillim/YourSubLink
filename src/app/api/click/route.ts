
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp, increment, Timestamp, getDoc } from 'firebase/firestore';
import { headers } from 'next/headers';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { linkId } = body;

        if (!linkId) {
            return new NextResponse('Link ID is required', { status: 400 });
        }
        
        const linkRef = doc(db, 'links', linkId);
        const linkSnap = await getDoc(linkRef);

        if (!linkSnap.exists()) {
             return new NextResponse(JSON.stringify({ error: 'Link not found' }), { 
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        const linkData = linkSnap.data();
        const batch = writeBatch(db);

        const headersList = headers();
        const ip = (headersList.get('x-forwarded-for') ?? '127.0.0.1').split(',')[0].trim();
        const userAgent = headersList.get('user-agent') ?? 'unknown';
        
        // --- Real Click Logic (Server-Side) ---
        let isRealClick = false;
        const oneHourAgo = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);

        const recentClicksQuery = query(
            collection(db, 'clicks'),
            where('linkId', '==', linkId),
            where('ipAddress', '==', ip),
            where('timestamp', '>=', oneHourAgo)
        );
        
        const recentClicksSnap = await getDocs(recentClicksQuery);

        if (recentClicksSnap.empty) {
            isRealClick = true;
        }

        // --- Firestore Updates ---
        // 1. Always create a historical click record.
        const clickDocRef = doc(collection(db, 'clicks'));
        batch.set(clickDocRef, {
            linkId: linkId,
            timestamp: serverTimestamp(),
            ipAddress: ip, 
            userAgent: userAgent,
            isRealClick: isRealClick,
        });

        // 2. Prepare increments for the link document
        const linkCounters: { [key: string]: any } = {
            clicks: increment(1)
        };

        if (isRealClick) {
            linkCounters.realClicks = increment(1);
            
            // 3. Handle monetization earnings for the real click if applicable
            if (linkData.monetizable) {
                // Use active CPM rate for earnings calculation
                const cpmQuery = query(collection(db, 'cpmHistory'), where('endDate', '==', null));
                const cpmSnap = await getDocs(cpmQuery);
                // Default to 3.00 if no active CPM is found
                const activeCpm = cpmSnap.empty ? 3.00 : cpmSnap.docs[0].data().rate;
                const earningsPerClick = activeCpm / 1000;
                
                linkCounters.generatedEarnings = increment(earningsPerClick);

                // Also increment on the user's total earnings
                if (linkData.userId) {
                    const userRef = doc(db, 'users', linkData.userId);
                    batch.update(userRef, {
                        generatedEarnings: increment(earningsPerClick)
                    });
                }

                // Increment earnings on the specific CPM entry for tracking
                if (!cpmSnap.empty) {
                    const cpmId = cpmSnap.docs[0].id;
                    const earningsByCpmField = `earningsByCpm.${cpmId}`;
                    linkCounters[earningsByCpmField] = increment(earningsPerClick);
                }
            }

            // 4. Handle milestone notifications (based on real clicks)
            const currentRealClicks = linkData.realClicks || 0;
            const newRealClicks = currentRealClicks + 1;
            const milestone = 1000;
            if (Math.floor(currentRealClicks / milestone) < Math.floor(newRealClicks / milestone)) {
                const reachedMilestone = Math.floor(newRealClicks / milestone) * milestone;
                const notificationRef = doc(collection(db, 'notifications'));
                batch.set(notificationRef, {
                    userId: linkData.userId,
                    linkId: linkId,
                    linkTitle: linkData.title,
                    type: 'milestone',
                    milestone: reachedMilestone,
                    message: `Your link "${linkData.title}" reached ${reachedMilestone.toLocaleString()} real visits!`,
                    createdAt: serverTimestamp(),
                    read: false
                });
            }
        }
        
        // 5. Apply all counter updates to the link document
        batch.update(linkRef, linkCounters);

        // Commit all batched writes to Firestore
        await batch.commit();
        
        // Return the necessary link data to the client
        return new NextResponse(JSON.stringify({ 
            originalUrl: linkData.original,
            rules: linkData.rules || [] 
        }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Error in /api/click:", error);
        return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
