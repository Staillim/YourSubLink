
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, writeBatch, doc, increment, serverTimestamp, Timestamp } from 'firebase/firestore';

export async function POST(req: NextRequest) {
    try {
        const { shortId } = await req.json();

        if (!shortId) {
            return NextResponse.json({ error: 'shortId is required' }, { status: 400 });
        }
        
        const ip = req.ip || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');

        if (!ip) {
            // Although this check is here, in most hosting environments (like Vercel/Netlify), 
            // req.ip will be available. We'll proceed without an IP for local dev if needed,
            // but clicks won't be "real".
            console.warn("Could not identify IP address. Clicks will not be counted as 'real'.");
        }

        const linksQuery = query(collection(db, 'links'), where('shortId', '==', shortId));
        const linksSnapshot = await getDocs(linksQuery);

        if (linksSnapshot.empty) {
            return NextResponse.json({ error: 'Link not found' }, { status: 404 });
        }

        const linkDoc = linksSnapshot.docs[0];
        const linkId = linkDoc.id;
        const linkData = linkDoc.data();
        const batch = writeBatch(db);

        // Always increment the total clicks counter
        const linkRef = doc(db, 'links', linkId);
        const linkCounters: { [key: string]: any } = {
            clicks: increment(1)
        };
        
        let isRealClick = false;
        if (ip) {
            const oneHourAgo = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
            const recentClicksQuery = query(
                collection(db, 'clicks'), 
                where('linkId', '==', linkId),
                where('ipAddress', '==', ip),
                where('timestamp', '>=', oneHourAgo)
            );
            const recentClicksSnapshot = await getDocs(recentClicksQuery);

            // A click is "real" if no recent clicks from this IP are found.
            if (recentClicksSnapshot.empty) {
                isRealClick = true;
            }
        }
        
        // Log the click event regardless
        const clickDocRef = doc(collection(db, 'clicks'));
        batch.set(clickDocRef, {
            linkId: linkId,
            timestamp: serverTimestamp(),
            ipAddress: ip || 'unknown',
            userAgent: req.headers.get('user-agent') || 'N/A',
            isRealClick: isRealClick,
        });

        if (isRealClick) {
            linkCounters.realClicks = increment(1);

            if (linkData.monetizable) {
                const activeCpm = 3.00;
                const earningsPerClick = activeCpm / 1000;
                
                linkCounters.generatedEarnings = increment(earningsPerClick);

                if (linkData.userId) {
                    const userRef = doc(db, 'users', linkData.userId);
                    batch.update(userRef, {
                        generatedEarnings: increment(earningsPerClick)
                    });
                }
            }

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
        
        batch.update(linkRef, linkCounters);

        await batch.commit();

        return NextResponse.json({ success: true, message: 'Click processed' });

    } catch (error) {
        console.error("Error processing click:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
