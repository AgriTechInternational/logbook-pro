import { useState, useEffect } from 'react';
import { Download, Share } from 'lucide-react';

export function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // Check if iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS && !isStandalone) {
        setShowIOSHint(true);
        setTimeout(() => setShowIOSHint(false), 8000);
      }
    }
  };

  if (isStandalone) return null;

  return (
    <div className="relative inline-block">
      <button
        onClick={handleInstallClick}
        className="flex flex-col items-center justify-center min-w-[65px] px-2 py-2.5 space-y-1.5 transition-all text-blue-400 bg-blue-900/10 rounded-2xl hover:bg-blue-900/20 border border-blue-500/10"
        title="Install as App"
      >
        <Download size={24} />
        <span className="text-[10px] font-bold tracking-wider">Install</span>
      </button>

      {showIOSHint && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-72 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl z-[100] animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Share className="text-blue-400" size={20} />
            </div>
            <div className="text-xs text-slate-200 leading-relaxed">
              <span className="text-blue-400 font-bold block mb-1">Remove the White Bar:</span>
              1. Tap the <strong className="text-white">Share</strong> button at the bottom of Safari.
              <br />
              2. Scroll down and tap <strong className="text-white">'Add to Home Screen'</strong>.
            </div>
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900 border-r border-b border-slate-800 rotate-45" />
        </div>
      )}
    </div>
  );
}
