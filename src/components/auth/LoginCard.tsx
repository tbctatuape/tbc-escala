import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Info,
  Send,
  ArrowLeft
} from 'lucide-react';

export const LoginCard: React.FC = () => {
  const { login, sendPasswordReset, noticeMessage, isLoading, supabaseConfig, clearNotice } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetFeedbackSent, setResetFeedbackSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isForgotPassword) {
      if (!email.trim()) return;
      const success = await sendPasswordReset(email);
      if (success) {
        setResetFeedbackSent(true);
      }
    } else {
      await login(email, password);
    }
  };

  const handleToggleForgotPassword = () => {
    clearNotice();
    setResetFeedbackSent(false);
    setIsForgotPassword(!isForgotPassword);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Main Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all">
        {/* Pure Black Top Header Banner */}
        <div className="bg-black p-6 sm:p-8 text-white text-center relative overflow-hidden border-b border-white/10">
          <div className="relative z-10 flex flex-col items-center">
            <img
              src="/logo.jpg"
              alt="Logo TBC"
              className="h-16 w-16 md:h-20 md:w-20 mx-auto rounded-full object-cover mb-3 shadow-lg border-2 border-white/10"
            />
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">
              TBC <span className="text-amber-400">Escala</span>
            </h1>
          </div>
        </div>

        {/* Supabase status warning banner if unconfigured */}
        {!supabaseConfig.isConfigured && (
          <div className="p-3.5 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Conexão Supabase Pendente</span>
              <span>
                As variáveis de ambiente do Supabase não foram detectadas. Informe a URL e Anon Key no menu de Configurações para conectar a base real.
              </span>
            </div>
          </div>
        )}

        {/* Notice Message Banner */}
        {noticeMessage && (
          <div
            className={`p-4 text-xs font-medium border-b flex items-start gap-2.5 ${
              noticeMessage.type === 'error'
                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                : noticeMessage.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20'
            }`}
          >
            {noticeMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
            )}
            <span className="flex-1 leading-relaxed">{noticeMessage.text}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-5">
          {isForgotPassword ? (
            /* --- RECOVERY FORM STATE --- */
            <div className="space-y-4 animate-fadeIn">
              {resetFeedbackSent ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Solicitação Enviada!
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Se o e-mail estiver cadastrado, você receberá um link de redefinição em instantes. Verifique sua caixa de entrada e spams.
                  </p>
                  <button
                    type="button"
                    onClick={handleToggleForgotPassword}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-black hover:bg-neutral-900 text-amber-400 font-bold text-xs rounded-xl border border-amber-400/30 shadow-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar para o Login</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                      Informe o E-mail Cadastrado
                    </label>
                    <div className="relative rounded-xl shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu.email@exemplo.com"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-3.5 px-4 bg-black hover:bg-neutral-900 text-amber-400 font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 touch-active min-h-[48px] focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Enviar Link de Recuperação</span>
                        <Send className="w-4 h-4 text-amber-400" />
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={handleToggleForgotPassword}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Voltar para o Login</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* --- NORMAL LOGIN FORM STATE --- */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  E-mail
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={handleToggleForgotPassword}
                    className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold focus:outline-none"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none min-h-[44px] min-w-[44px] justify-center"
                    aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3.5 px-4 bg-black hover:bg-neutral-900 text-amber-400 font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 touch-active min-h-[48px] focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Entrar</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
