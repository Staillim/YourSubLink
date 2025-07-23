
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

        const headersList = headers();
        // Use a combination of headers for a more unique identifier
        const ip = (headersList.get('x-forwarded-for') ?? '127.0.0.1').split(',')[0];
        const userAgent = headersList.get('user-agent') ?? 'unknown';
        const visitorId = `${ip}-${userAgent}`; // Create a more unique ID

        const linkRef = doc(db, 'links', linkId);
        const linkSnap = await getDoc(linkRef);

        if (!linkSnap.exists()) {
             return new NextResponse('Link not found', { status: 404 });
        }

        const linkData = linkSnap.data();
        const batch = writeBatch(db);
        const clickDocRef = doc(collection(db, 'clicks'));

        // --- Real Click Logic (Server-Side) ---
        let isRealClick = false;
        const oneHourAgo = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);

        const recentClicksQuery = query(
            collection(db, 'clicks'),
            where('linkId', '==', linkId),
            where('ipAddress', '==', ip), // Check against the real IP
            where('timestamp', '>=', oneHourAgo)
        );
        
        const recentClicksSnap = await getDocs(recentClicksQuery);

        if (recentClicksSnap.empty) {
            isRealClick = true;
        }

        // --- Firestore Updates ---
        // 1. Create a historical click record with the real IP
        batch.set(clickDocRef, {
            linkId: linkId,
            timestamp: serverTimestamp(),
            ipAddress: ip, 
            userAgent: userAgent,
            isRealClick: isRealClick,
        });

        // 2. Increment counters on the link
        const linkCounters: { [key: string]: any } = {
            clicks: increment(1)
        };
        if (isRealClick) {
            linkCounters.realClicks = increment(1);
        }
        
        // 3. Handle monetization earnings for the real click if applicable
        if (isRealClick && linkData.monetizable) {
            const CPM = 3.00; // Cost Per Mille (1000 views)
            const earningsPerClick = CPM / 1000;
            linkCounters.generatedEarnings = increment(earningsPerClick);
        }
        
        batch.update(linkRef, linkCounters);

        // 4. Handle milestone notifications (based on real clicks)
        if (isRealClick) {
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

        await batch.commit();
        
        return new NextResponse('Click recorded', { status: 200 });

    } catch (error) {
        console.error("Error in /api/click:", error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
