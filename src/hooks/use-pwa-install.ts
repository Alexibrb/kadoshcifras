'use client';
import { useState, useEffect } from 'react';

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detecta se é iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // Detecta se é mobile genérico (Android/iOS)
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(mobile);

    // Detecta se já está rodando como app instalado
    const standalone = (window.matchMedia('(display-mode: standalone)').matches) || (window.navigator as any).standalone;
    setIsStandalone(standalone);

    const handler = (e: any) => {
      // Impede que o navegador mostre o prompt automático
      e.preventDefault();
      // Guarda o evento para disparar depois
      setInstallPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Se o evento já disparou antes do componente montar, alguns navegadores permitem capturar via estado
    if (window.hasOwnProperty('BeforeInstallPromptEvent')) {
       // Infelizmente não há API padrão para recuperar um evento passado, 
       // mas o listener acima cobre 99% dos casos no ciclo de vida do React.
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const installApp = async () => {
    if (!installPrompt) {
      console.warn("Prompt de instalação não disponível.");
      return;
    }
    
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setInstallPrompt(null);
    }
  };

  return { isInstallable, isIOS, isStandalone, isMobile, installApp };
}
