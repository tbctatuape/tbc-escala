import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Share, Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // If running as an installed PWA, hide button
  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="px-3 py-1.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold transition-all flex items-center gap-1.5 touch-active min-h-[36px]"
        title="Instalar aplicativo TBC Escala na tela inicial"
      >
        <Download className="w-3.5 h-3.5 stroke-[2.5]" />
        <span className="hidden xs:inline">Instalar App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSModal(true)}
          className="px-3 py-1.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold transition-all flex items-center gap-1.5 touch-active min-h-[36px]"
          title="Instalar aplicativo TBC Escala no iOS"
        >
          <Share className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="hidden xs:inline">Instalar App</span>
        </button>

        {showIOSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn text-white">
            <div className="bg-slate-900 w-full max-w-sm rounded-3xl border border-slate-800 shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-sm">Instalar no iOS (Safari)</h3>
                </div>
                <button onClick={() => setShowIOSModal(false)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <p>1. Toque no ícone de <strong>Compartilhar</strong> no Safari.</p>
                <p>2. Selecione <strong>"Adicionar à Tela de Início"</strong>.</p>
                <p>3. Toque em <strong>"Adicionar"</strong> no canto superior direito.</p>
              </div>

              <button
                onClick={() => setShowIOSModal(false)}
                className="w-full py-2 bg-amber-400 text-slate-950 font-bold rounded-xl text-xs"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
