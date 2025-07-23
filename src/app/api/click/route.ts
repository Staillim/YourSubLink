
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, writeBatch, doc, increment, serverTimestamp, Timestamp } from 'firebase/firestore';

export async function POST(req: NextRequest) {
    try {
        const { shortId } = await req.json();

        if (!shortId) {
            return NextResponse.json({ error: 'shortId is required' }, { status: 400 });
        }
        
        // Get the real IP address from the request headers
        const ip = req.ip || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');

        if (!ip) {
            return NextResponse.json({ error: 'Could not identify IP address' }, { status: 400 });
        }

        // --- Find the link document ---
        const linksQuery = query(collection(db, 'links'), where('shortId', '==', shortId));
        const linksSnapshot = await getDocs(linksQuery);

        if (linksSnapshot.empty) {
            return NextResponse.json({ error: 'Link not found' }, { status: 404 });
        }

        const linkDoc = linksSnapshot.docs[0];
        const linkId = linkDoc.id;
        const linkData = linkDoc.data();

        const batch = writeBatch(db);

        // --- Determine if it's a "real" click ---
        let isRealClick = false;
        const oneHourAgo = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);

        const recentClicksQuery = query(collection(db, 'clicks'), 
            where('linkId', '==', linkId),
            where('ipAddress', '==', ip),
            where('timestamp', '>=', oneHourAgo)
        );

        const recentClicksSnapshot = await getDocs(recentClicksQuery);

        if (recentClicksSnapshot.empty) {
            isRealClick = true;
        }

        // --- Log the click event ---
        const clickDocRef = doc(collection(db, 'clicks'));
        batch.set(clickDocRef, {
            linkId: linkId,
            timestamp: serverTimestamp(),
            ipAddress: ip,
            userAgent: req.headers.get('user-agent') || 'N/A',
            isRealClick: isRealClick,
        });

        // --- Prepare link counters update ---
        const linkCounters: { [key: string]: any } = {
            clicks: increment(1)
        };

        if (isRealClick) {
            linkCounters.realClicks = increment(1);

            // If the link is monetizable, calculate and add earnings
            if (linkData.monetizable) {
                // For now, using a fixed CPM of $3.00
                const activeCpm = 3.00; 
                const earningsPerClick = activeCpm / 1000;
                
                linkCounters.generatedEarnings = increment(earningsPerClick);

                // Increment user's total earnings if userId exists
                if (linkData.userId) {
                    const userRef = doc(db, 'users', linkData.userId);
                    batch.update(userRef, {
                        generatedEarnings: increment(earningsPerClick)
                    });
                }
            }

            // Handle milestone notifications
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
        
        // --- Apply updates ---
        const linkRef = doc(db, 'links', linkId);
        batch.update(linkRef, linkCounters);

        await batch.commit();

        return NextResponse.json({ success: true, message: 'Click processed' });

    } catch (error) {
        console.error("Error processing click:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
