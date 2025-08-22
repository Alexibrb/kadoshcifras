
// src/services/user-service.ts
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { User as FirebaseAuthUser } from 'firebase/auth';

interface UserData {
    displayName: string;
}

/**
 * Cria um documento de usuário no Firestore no momento do cadastro.
 * Garante que o documento exista com `isApproved: false` por padrão.
 * @param user O objeto de usuário do Firebase Auth.
 * @param additionalData Dados adicionais, como o nome de exibição.
 */
export const createUserDocument = async (user: FirebaseAuthUser, additionalData: UserData) => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const { email } = user;
    
    // Dados a serem definidos para um novo usuário.
    // Usar setDoc garante que o documento seja criado com este estado exato.
    const userData = {
        displayName: additionalData.displayName,
        email,
        isApproved: false, // Novos usuários sempre começam como não aprovados.
        role: 'user',      // Papel padrão.
        createdAt: serverTimestamp(),
    };

    try {
        await setDoc(userRef, userData);
    } catch (error) {
        console.error("Erro ao criar documento do usuário:", error);
        // Lançar o erro pode ajudar a depurar na página de cadastro se algo der errado.
        throw error;
    }
};
