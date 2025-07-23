
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';

// This is a new, read-only route to safely fetch link data
// without incrementing any counters.
export async function POST(req: NextRequest) {
    try {
        const { shortId } = await req.json();

        if (!shortId) {
            return NextResponse.json({ error: 'shortId is required' }, { status: 400 });
        }

        const linksCollection = collection(db, 'links');
        const q = query(linksCollection, where('shortId', '==', shortId));
        const linksSnapshot = await getDocs(q);

        if (linksSnapshot.empty) {
            return NextResponse.json({ error: 'Link not found' }, { status: 404 });
        }

        const linkDoc = linksSnapshot.docs[0];
        const linkData = linkDoc.data();

        const responsePayload = {
            link: {
                ...linkData,
                id: linkDoc.id,
            },
            action: (linkData.rules && linkData.rules.length > 0) ? 'GATE' : 'REDIRECT',
        };
        
        return NextResponse.json(responsePayload, { status: 200 });

    } catch (error) {
        console.error("Error fetching link data:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
