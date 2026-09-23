import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { 
  Download, 
  X, 
  Share, 
  Smartphone, 
  CheckCircle2, 
  ChevronRight,
  Info
} from 'lucide-react';

export const PWAInstallCard: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'ios' | 'android'>('ios');
  const [dismissed, setDismissed] = useState(false);

  // Detect Android
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

  useEffect(() => {
    const isDismissed = localStorage.getItem('tbc_pwa_banner_dismissed') === 'true';
    setDismissed(isDismissed);

    // Default tab based on user's device
    if (isAndroid) {
      setActiveTab('android');
    } else {
      setActiveTab('ios');
    }
  }, [isAndroid]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('tbc_pwa_banner_dismissed', 'true');
  };

  const handleOpenTutorial = (tab: 'ios' | 'android') => {
    setActiveTab(tab);
    setShowModal(true);
  };

  // If already running as installed PWA app, hide
  if (isInstalled) {
    return null;
  }

  return (
    <>
      {/* ULTRA-MINIMALIST NOTIFICATION BAR */}
      {!dismissed && (
        <div className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 text-xs transition-all animate-fadeIn">
          {/* Left: Icon + Text */}
          <div className="flex items-center gap-2 min-w-0">
            <Smartphone className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <p className="text-slate-600 dark:text-slate-400 truncate text-[11px] sm:text-xs">
              Instale o <span className="font-semibold text-slate-900 dark:text-slate-200">TBC Escala</span> no seu iPhone ou Android
            </p>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2.5 shrink-0 text-[11px] sm:text-xs">
            {isInstallable && (
              <button
                onClick={install}
                className="font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                <span>Instalar</span>
              </button>
            )}

            <button
              onClick={() => handleOpenTutorial(isAndroid ? 'android' : 'ios')}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium inline-flex items-center gap-0.5 hover:underline"
            >
              <span>Como fazer</span>
              <ChevronRight className="w-3 h-3 opacity-60" />
            </button>

            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 transition-colors"
              title="Dispensar aviso"
              aria-label="Dispensar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* DISCREET RE-OPEN LINK IF DISMISSED */}
      {dismissed && !isInstalled && (
        <div className="flex justify-end pt-0.5">
          <button
            onClick={() => setShowModal(true)}
            className="text-[11px] text-slate-400 hover:text-amber-500 transition-colors inline-flex items-center gap-1"
          >
            <Smartphone className="w-3 h-3 opacity-70" />
            <span>Como instalar no celular?</span>
          </button>
        </div>
      )}

      {/* TUTORIAL MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn text-white">
          <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-800 shadow-2xl p-4 sm:p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">
                  Instalar TBC Escala
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Platform Selector Tabs */}
            <div className="grid grid-cols-2 gap-1 bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/60 text-xs">
              <button
                onClick={() => setActiveTab('ios')}
                className={`py-1.5 px-2 rounded-lg font-semibold transition-all ${
                  activeTab === 'ios'
                    ? 'bg-slate-950 text-amber-400 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🍎 iPhone (iOS)
              </button>

              <button
                onClick={() => setActiveTab('android')}
                className={`py-1.5 px-2 rounded-lg font-semibold transition-all ${
                  activeTab === 'android'
                    ? 'bg-slate-950 text-amber-400 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🤖 Android
              </button>
            </div>

            {/* TAB CONTENT: IPHONE */}
            {activeTab === 'ios' && (
              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="p-2.5 bg-amber-400/10 border border-amber-400/20 rounded-xl flex items-start gap-2 text-[11px] text-amber-300">
                  <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    No iPhone/iPad, use o navegador <strong>Safari</strong>.
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2 p-2 rounded-xl bg-slate-800/50 border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[10px]">
                      1
                    </span>
                    <span className="leading-snug">
                      No Safari, toque no ícone de <strong>Compartilhar</strong> (<Share className="w-3 h-3 inline text-amber-400 mx-0.5" /> na barra inferior).
                    </span>
                  </div>

                  <div className="flex items-start gap-2 p-2 rounded-xl bg-slate-800/50 border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[10px]">
                      2
                    </span>
                    <span className="leading-snug">
                      Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.
                    </span>
                  </div>

                  <div className="flex items-start gap-2 p-2 rounded-xl bg-slate-800/50 border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[10px]">
                      3
                    </span>
                    <span className="leading-snug">
                      No canto superior direito, toque em <strong>"Adicionar"</strong>.
                    </span>
                  </div>
                </div>

                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>O app aparecerá na tela inicial com o ícone oficial!</span>
                </div>
              </div>
            )}

            {/* TAB CONTENT: ANDROID */}
            {activeTab === 'android' && (
              <div className="space-y-2.5 text-xs text-slate-300">
                {isInstallable && (
                  <div className="p-2.5 bg-amber-400/10 border border-amber-400/20 rounded-xl flex items-center justify-between gap-2">
                    <span className="text-[11px] text-amber-300 font-medium">
                      Instalação direta disponível:
                    </span>
                    <button
                      onClick={install}
                      className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg"
                    >
                      Instalar
                    </button>
                  </div>
                )}

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2 p-2 rounded-xl bg-slate-800/50 border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[10px]">
                      1
                    </span>
                    <span className="leading-snug">
                      No <strong>Chrome</strong> ou Samsung Internet, toque no menu de <strong>três pontinhos (⋮)</strong> no canto superior.
                    </span>
                  </div>

                  <div className="flex items-start gap-2 p-2 rounded-xl bg-slate-800/50 border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[10px]">
                      2
                    </span>
                    <span className="leading-snug">
                      Toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                    </span>
                  </div>

                  <div className="flex items-start gap-2 p-2 rounded-xl bg-slate-800/50 border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[10px]">
                      3
                    </span>
                    <span className="leading-snug">
                      Confirme em <strong>"Instalar"</strong>.
                    </span>
                  </div>
                </div>

                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Pronto! O app funcionará como um aplicativo nativo.</span>
                </div>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="w-full py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs transition-all touch-active"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
