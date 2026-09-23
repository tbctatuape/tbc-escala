import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, X, Share, Smartphone, CheckCircle2, Sparkles } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem('tbc_pwa_banner_dismissed') === 'true';
    setDismissed(isDismissed);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('tbc_pwa_banner_dismissed', 'true');
  };

  // If already installed, hide completely
  if (isInstalled) {
    return null;
  }

  // If not installable and not iOS, or if dismissed, hide banner (but topbar button can still exist)
  if (!isInstallable && !isIOS) {
    return null;
  }

  if (dismissed) {
    return null;
  }

  return (
    <>
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/80 to-slate-900 border-b border-amber-500/30 text-white px-4 py-3 shadow-lg relative z-30 animate-fadeIn">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md font-bold">
              <Smartphone className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="font-display font-bold text-xs sm:text-sm text-white flex items-center justify-center sm:justify-start gap-1.5">
                <span>Instale o app do TBC Escala na sua tela inicial</span>
                <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  <Sparkles className="w-3 h-3 inline mr-1" /> Exp. Nativa
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Acesso rápido, funcionamento offline e confirmações em 1 toque no Android e iOS.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {isInstallable && (
              <button
                onClick={install}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all touch-active min-h-[38px]"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Instalar App</span>
              </button>
            )}

            {isIOS && (
              <button
                onClick={() => setShowIOSModal(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all touch-active min-h-[38px]"
              >
                <Share className="w-4 h-4 stroke-[2.5]" />
                <span>Instalar no iPhone / iPad</span>
              </button>
            )}

            <button
              onClick={handleDismiss}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
              title="Fechar aviso"
              aria-label="Fechar aviso de instalação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 text-white w-full max-w-sm rounded-3xl border border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white">Instalar no iOS (Safari)</h3>
                  <p className="text-[11px] text-slate-400">TBC Escala no seu iPhone / iPad</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/80 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                <div>
                  No navegador Safari, toque no ícone de <strong>Compartilhar</strong> <Share className="w-4 h-4 inline text-amber-400 mx-0.5" /> no menu inferior.
                </div>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/80 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                <div>
                  Role para baixo na lista e toque em <strong>"Adicionar à Tela de Início"</strong>.
                </div>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/80 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center shrink-0 text-xs">3</span>
                <div>
                  Confirme clicando em <strong>"Adicionar"</strong> no canto superior direito. Pronto!
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs transition-all touch-active"
            >
              Entendido!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
