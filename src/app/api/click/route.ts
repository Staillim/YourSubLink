
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, writeBatch, doc, increment, serverTimestamp, Timestamp } from 'firebase/firestore';

// Function to get the client's IP address
const getClientIp = (req: NextRequest): string | undefined => {
    // Standard headers for IP detection
    const headers = {
        'x-forwarded-for': req.headers.get('x-forwarded-for'),
        'x-real-ip': req.headers.get('x-real-ip'),
    };
    // Vercel specific header
    if (req.headers.get('x-vercel-forwarded-for')) {
         headers['x-forwarded-for'] = req.headers.get('x-vercel-forwarded-for');
    }

    // Use the most reliable header first
    const ip = headers['x-forwarded-for']?.split(',')[0].trim() || headers['x-real-ip'];
    
    return ip;
};


export async function POST(req: NextRequest) {
    try {
        const { shortId } = await req.json();

        if (!shortId) {
            return NextResponse.json({ error: 'shortId is required' }, { status: 400 });
        }
        
        const ip = getClientIp(req);

        // --- Step 1: Find the link document ---
        const linksQuery = query(collection(db, 'links'), where('shortId', '==', shortId));
        const linksSnapshot = await getDocs(linksQuery);

        if (linksSnapshot.empty) {
            return NextResponse.json({ error: 'Link not found' }, { status: 404 });
        }

        const linkDoc = linksSnapshot.docs[0];
        const linkId = linkDoc.id;
        const linkData = linkDoc.data();
        
        // --- Step 2: Determine if the click is "real" ---
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
            if (recentClicksSnapshot.empty) {
                isRealClick = true;
            }
        }

        // --- Step 3: Perform database updates in a batch ---
        const batch = writeBatch(db);
        const linkRef = doc(db, 'links', linkId);
        
        // 3a. Increment total clicks counter
        const linkCounters: { [key: string]: any } = {
            clicks: increment(1)
        };

        // 3b. If it's a real click, increment real counters and handle earnings
        if (isRealClick) {
            linkCounters.realClicks = increment(1);

            if (linkData.monetizable) {
                // In a real app, this value should come from a central config
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
        }
        batch.update(linkRef, linkCounters);

        // 3c. Log the click event itself
        const clickDocRef = doc(collection(db, 'clicks'));
        batch.set(clickDocRef, {
            linkId: linkId,
            timestamp: serverTimestamp(),
            ipAddress: ip || 'unknown',
            userAgent: req.headers.get('user-agent') || 'N/A',
            isRealClick: isRealClick,
        });

        await batch.commit();
        
        // --- Step 4: Return instructions to the client ---
        const hasRules = linkData.rules && linkData.rules.length > 0;

        if (hasRules) {
            return NextResponse.json({
                action: 'GATE',
                linkData: {
                    id: linkId,
                    original: linkData.original,
                    rules: linkData.rules,
                    title: linkData.title,
                    description: linkData.description,
                    userId: linkData.userId,
                    monetizable: linkData.monetizable
                }
            });
        } else {
            return NextResponse.json({
                action: 'REDIRECT',
                destination: linkData.original
            });
        }

    } catch (error) {
        console.error("Error processing click:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
