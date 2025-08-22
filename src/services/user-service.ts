
// src/services/user-service.ts
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { User as FirebaseAuthUser } from 'firebase/auth';

interface UserData {
    displayName: string;
}

/**
 * Cria ou atualiza um documento de usuário no Firestore.
 * Garante que o documento exista com `isApproved: false` por padrão no momento do cadastro.
 * @param user O objeto de usuário do Firebase Auth.
 * @param additionalData Dados adicionais, como o nome de exibição.
 */
export const createUserDocument = async (user: FirebaseAuthUser, additionalData: UserData) => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const { displayName, email } = user;
    
    // Os dados que queremos garantir que existam no documento.
    const userData = {
        displayName: additionalData.displayName || displayName,
        email,
        isApproved: false, // O usuário não está aprovado por padrão.
        role: 'user', // Define uma role padrão.
        createdAt: serverTimestamp(), // Registra o horário do servidor.
    };

    try {
        // setDoc com { merge: true } criaria o doc se não existir, ou mesclaria os dados se já existir.
        // Mas para garantir a consistência no momento do cadastro, um setDoc simples é mais seguro
        // para definir o estado inicial do usuário.
        await setDoc(userRef, userData);
    } catch (error) {
        console.error("Erro ao criar documento do usuário:", error);
    }
};
