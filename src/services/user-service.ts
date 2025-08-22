// src/services/user-service.ts
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import type { User as FirebaseAuthUser } from 'firebase/auth';

interface UserData {
    displayName: string;
}

/**
 * Cria um novo documento de usuário no Firestore quando um novo usuário se cadastra.
 * A conta é criada com `isApproved: false` por padrão.
 * @param user O objeto de usuário do Firebase Auth.
 * @param additionalData Dados adicionais, como o nome de exibição.
 */
export const createUserDocument = async (user: FirebaseAuthUser, additionalData: UserData) => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
        const { displayName, email } = user;
        const createdAt = serverTimestamp();

        try {
            await setDoc(userRef, {
                displayName: additionalData.displayName || displayName,
                email,
                createdAt,
                isApproved: false, // O usuário não está aprovado por padrão
                role: 'user', // Define uma role padrão
            });
        } catch (error) {
            console.error("Erro ao criar documento do usuário:", error);
        }
    }
};
