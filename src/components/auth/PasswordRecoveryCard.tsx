import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Mail, 
  ArrowLeft, 
  Send, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Lock, 
  Check, 
  ShieldCheck 
} from 'lucide-react';

export const PasswordRecoveryCard: React.FC = () => {
  const { status, sendPasswordReset, updateUserPassword, setAuthStatus, noticeMessage, isLoading, clearNotice } = useAuth();

  // Reset link request state
  const [email, setEmail] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);

  // New Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const isResettingMode = status === 'recovery';

  // Password strength logic
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200 dark:bg-slate-700' };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) {
      return { score: 1, label: 'Senha Fraca', color: 'bg-red-500' };
    } else if (score <= 4) {
      return { score: 2, label: 'Senha Média', color: 'bg-amber-400' };
    } else {
      return { score: 3, label: 'Senha Forte', color: 'bg-emerald-500' };
    }
  };

  const strength = getPasswordStrength(newPassword);

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    const success = await sendPasswordReset(email);
    if (success) {
      setSentSuccess(true);
    }
  };

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas digitadas não coincidem. Verifique novamente.');
      return;
    }

    await updateUserPassword(newPassword);
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all">
        {/* Header Banner */}
        <div className="bg-black p-6 sm:p-8 text-white text-center relative overflow-hidden border-b border-white/10">
          <img
            src="/logo.jpg"
            alt="Logo TBC"
            className="h-16 w-16 md:h-20 md:w-20 mx-auto rounded-full object-cover mb-3 shadow-lg border-2 border-white/10"
          />
          <h1 className="font-display text-xl font-bold text-white">
            {isResettingMode ? 'Definir Nova Senha' : 'Recuperação de Senha'}
          </h1>
        </div>

        {/* Global Notice Message */}
        {noticeMessage && (
          <div
            className={`p-4 text-xs font-medium border-b flex items-start gap-2.5 ${
              noticeMessage.type === 'error'
                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
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

        {/* Local Password Error */}
        {passwordError && (
          <div className="p-3 bg-red-500/10 border-b border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{passwordError}</span>
          </div>
        )}

        <div className="p-6 sm:p-8 space-y-5">
          {isResettingMode ? (
            /* --- FORMULÁRIO DE DEFINIR NOVA SENHA --- */
            <form onSubmit={handleUpdatePasswordSubmit} className="space-y-4">
              {/* Nova Senha */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Nova Senha <span className="text-amber-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-w-[36px] justify-center"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">Força da Senha:</span>
                      <span className={`font-bold ${
                        strength.score === 1 ? 'text-red-500' : strength.score === 2 ? 'text-amber-500' : 'text-emerald-500'
                      }`}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex gap-1">
                      <div className={`h-full flex-1 transition-all ${strength.score >= 1 ? strength.color : 'bg-transparent'}`} />
                      <div className={`h-full flex-1 transition-all ${strength.score >= 2 ? strength.color : 'bg-transparent'}`} />
                      <div className={`h-full flex-1 transition-all ${strength.score >= 3 ? strength.color : 'bg-transparent'}`} />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmar Nova Senha */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Confirmar Nova Senha <span className="text-amber-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-w-[36px] justify-center"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-black hover:bg-neutral-900 text-amber-400 font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 touch-active min-h-[48px] focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 text-amber-400" />
                    <span>Salvar Nova Senha</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* --- FORMULÁRIO DE PEDIR EMAIL DE RECUPERAÇÃO --- */
            !sentSuccess ? (
              <form onSubmit={handleSendResetEmail} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Informe o e-mail cadastrado
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu.email@exemplo.com"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all min-h-[44px]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-black hover:bg-neutral-900 text-amber-400 font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 touch-active min-h-[48px] focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Enviar Link de Redefinição</span>
                      <Send className="w-4 h-4 text-amber-400" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="text-center py-2 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  E-mail enviado!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Verifique a caixa de entrada do seu e-mail e clique no link de redefinição enviado.
                </p>
              </div>
            )
          )}

          {/* Back to login */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                clearNotice();
                setAuthStatus('unauthenticated');
              }}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors min-h-[44px] px-3 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para a tela de login</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
