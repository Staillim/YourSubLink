
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, writeBatch, doc, increment, serverTimestamp, Timestamp } from 'firebase/firestore';

export async function POST(req: NextRequest) {
    try {
        const { shortId, deviceId, isUniqueByClient } = await req.json();

        if (!shortId || !deviceId) {
            return NextResponse.json({ error: 'shortId and deviceId are required' }, { status: 400 });
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
        const linkRef = doc(db, 'links', linkId);
        
        let isRealClickByServer = false;

        // --- Server-side deviceId check ---
        const oneHourAgo = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
        const recentClicksQuery = query(
            collection(db, 'clicks'), 
            where('linkId', '==', linkId),
            where('deviceId', '==', deviceId),
            where('timestamp', '>=', oneHourAgo)
        );
        const recentClicksSnapshot = await getDocs(recentClicksQuery);
        
        if (recentClicksSnapshot.empty) {
            isRealClickByServer = true;
        }

        // A click is only "real" if both the client and server agree.
        const isRealClick = isUniqueByClient && isRealClickByServer;
        
        // --- Atomically update all documents ---

        // 1. Increment total clicks counter
        const linkCounters: { [key: string]: any } = {
            clicks: increment(1)
        };

        // 2. If it's a real click, increment real counters and handle earnings
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
            
            // 3. Handle milestone notifications based on real clicks
            const currentRealClicks = linkData.realClicks || 0;
            const newRealClicks = currentRealClicks + 1;
            const milestone = 1000;
            if (Math.floor(newRealClicks / milestone) > Math.floor(currentRealClicks / milestone)) {
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

        // 4. Log the click event itself
        const clickDocRef = doc(collection(db, 'clicks'));
        batch.set(clickDocRef, {
            linkId: linkId,
            timestamp: serverTimestamp(),
            deviceId: deviceId,
            userAgent: req.headers.get('user-agent') || 'N/A',
            isRealClick: isRealClick,
            clientValidation: isUniqueByClient,
            serverValidation: isRealClickByServer,
        });

        await batch.commit();

        return NextResponse.json({ success: true, timestamp: Date.now() });

    } catch (error) {
        console.error("Error processing click:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
