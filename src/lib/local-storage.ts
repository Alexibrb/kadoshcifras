// src/lib/local-storage.ts

export function setLastSyncTime(time: Date) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem('lastSyncTime', time.toISOString());
    } catch (error) {
        console.error("Falha ao definir o tempo de sincronização:", error);
    }
}

export function getLastSyncTime(): Date | null {
    if (typeof window === 'undefined') return null;
    try {
        const timeString = window.localStorage.getItem('lastSyncTime');
        return timeString ? new Date(timeString) : null;
    } catch (error) {
        console.error("Falha ao obter o tempo de sincronização:", error);
        return null;
    }
}
