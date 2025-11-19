
"use client";

import { useState, useEffect, useCallback } from 'react';

// Função para parsear o JSON de forma segura
function parseJSON<T>(value: string | null): T | undefined {
  try {
    return value === 'undefined' ? undefined : JSON.parse(value ?? '');
  } catch {
    console.warn('Erro ao parsear JSON do localStorage', { value });
    return undefined;
  }
}

/**
 * Um hook robusto para sincronizar o estado do React com o localStorage.
 * Garante que o localStorage só seja acessado no lado do cliente.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {

  // A função `readValue` obtém o valor do localStorage ou retorna o valor inicial.
  // Ela é envolvida em `useCallback` para não ser recriada a cada renderização.
  const readValue = useCallback((): T => {
    // Previne a execução no servidor
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      // Se o item existir, faz o parse, senão, usa o valor inicial
      return item ? (parseJSON(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Erro ao ler a chave do localStorage “${key}”:`, error);
      return initialValue;
    }
  }, [initialValue, key]);

  // O estado é inicializado com o valor lido do localStorage
  const [storedValue, setStoredValue] = useState<T>(readValue);

  // A função `setValue` atualiza o estado do React e o localStorage.
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      // Previne a execução no servidor
      if (typeof window == 'undefined') {
        console.warn(
          `Tentativa de definir a chave “${key}” no localStorage em um ambiente de servidor.`
        );
      }

      try {
        // Permite que o novo valor seja uma função (como no useState)
        const newValue = value instanceof Function ? value(storedValue) : value;
        // Salva o novo valor no localStorage
        window.localStorage.setItem(key, JSON.stringify(newValue));
        // Atualiza o estado do React
        setStoredValue(newValue);
        // Dispara um evento para que outros hooks useLocalStorage na mesma página possam se atualizar
        window.dispatchEvent(new Event('local-storage'));
      } catch (error) {
        console.warn(`Erro ao definir a chave do localStorage “${key}”:`, error);
      }
    },
    [key, storedValue]
  );

  // useEffect para garantir que o estado seja atualizado se o valor inicial mudar.
  useEffect(() => {
    setStoredValue(readValue());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // useEffect para ouvir mudanças no storage de outras abas/janelas.
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent | CustomEvent) => {
        if ((event as StorageEvent)?.key && (event as StorageEvent).key !== key) {
            return;
        }
       setStoredValue(readValue());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage', handleStorageChange);

    // Limpa os listeners quando o componente é desmontado
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage', handleStorageChange);
    };
  }, [key, readValue]);

  return [storedValue, setValue];
}
