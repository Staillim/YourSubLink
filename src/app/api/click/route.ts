
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, writeBatch, doc, increment, serverTimestamp, Timestamp } from 'firebase/firestore';

export async function POST(req: NextRequest) {
    try {
        const { shortId, isUniqueByClient } = await req.json();

        if (!shortId) {
            return NextResponse.json({ error: 'shortId is required' }, { status: 400 });
        }
        
        // DEBUG: Using a hardcoded IP address for testing
        const ip = 'x.x.x.x';

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

        // --- Server-side IP check ---
        if (ip) {
            const oneHourAgo = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
            const recentClicksQuery = query(
                collection(db, 'clicks'), 
                where('linkId', '==', linkId),
                where('ipAddress', '==', ip),
                where('timestamp', '>=', oneHourAgo)
            );
            const recentClicksSnapshot = await getDocs(recentClicksQuery);
            if (recentClicksSnapshot.empty) {
                isRealClickByServer = true;
            }
        } else {
            // This case should not be hit with a hardcoded IP, but keeping for safety.
            isRealClickByServer = true; 
        }

        const isRealClick = isUniqueByClient && isRealClickByServer;
        
        // --- Atomically update all documents ---

        const linkCounters: { [key: string]: any } = {
            clicks: increment(1)
        };

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

        const clickDocRef = doc(collection(db, 'clicks'));
        batch.set(clickDocRef, {
            linkId: linkId,
            timestamp: serverTimestamp(),
            ipAddress: ip,
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
