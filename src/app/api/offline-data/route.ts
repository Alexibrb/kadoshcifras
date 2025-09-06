
// src/app/api/offline-data/route.ts

import { NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';

const collectionsToSync = ['songs', 'setlists', 'artists', 'genres', 'categories', 'users'];

// Função para converter Timestamps do Firestore para strings ISO 8601
// O IndexedDB não consegue armazenar objetos Timestamp do Firestore diretamente.
const convertTimestamps = (obj: any): any => {
    if (obj instanceof Timestamp) {
        return obj.toDate().toISOString();
    }
    if (Array.isArray(obj)) {
        return obj.map(convertTimestamps);
    }
    if (obj !== null && typeof obj === 'object') {
        const newObj: { [key: string]: any } = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                newObj[key] = convertTimestamps(obj[key]);
            }
        }
        return newObj;
    }
    return obj;
};


export async function GET() {
    try {
        const allData: { [key: string]: any[] } = {};

        for (const collectionName of collectionsToSync) {
            const querySnapshot = await getDocs(collection(db, collectionName));
            const data = querySnapshot.docs.map(doc => {
                const docData = doc.data();
                // Converte timestamps antes de enviar
                const convertedData = convertTimestamps(docData);
                return {
                    id: doc.id,
                    ...convertedData
                };
            });
            allData[collectionName] = data;
        }

        return NextResponse.json({ collections: allData });

    } catch (error: any) {
        console.error('Erro ao buscar dados para offline:', error);
        return new NextResponse(
            JSON.stringify({ success: false, message: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
