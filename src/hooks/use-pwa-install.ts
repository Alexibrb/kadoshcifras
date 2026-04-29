'use client';
import { useState, useEffect } from 'react';

// Variável global para persistir o evento entre navegações de página (SPA)
let deferredPrompt: any = null;

export function usePWAInstall() {
  const [isInstallable, setIsInstallable] = useState(!!deferredPrompt);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detecta se é iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // Detecta se é mobile genérico
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(mobile);

    // Detecta se já está rodando como app instalado
    const standalone = (window.matchMedia('(display-mode: standalone)').matches) || (window.navigator as any).standalone;
    setIsStandalone(standalone);

    // Se já temos um prompt capturado anteriormente, atualizamos o estado
    if (deferredPrompt) {
      setIsInstallable(true);
    }

    const handler = (e: any) => {
      // Impede o prompt automático
      e.preventDefault();
      // Armazena o evento globalmente
      deferredPrompt = e;
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) {
      console.warn("Prompt de instalação não disponível.");
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstallable(false);
      deferredPrompt = null;
    }
  };

  return { isInstallable, isIOS, isStandalone, isMobile, installApp };
}
