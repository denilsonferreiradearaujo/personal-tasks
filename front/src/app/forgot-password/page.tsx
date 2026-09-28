'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckSquare,
  Mail,
  Phone,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Lock,
  RefreshCw,
  Eye,
  EyeOff,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import api from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function ForgotPasswordPage() {
  const { settings } = useSettings();

  // Método selecionado: 'email' ou 'whatsapp'
  const [method, setMethod] = useState<'email' | 'whatsapp'>('whatsapp');

  // Campos do formulário
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Fluxo OTP (WhatsApp)
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [timer, setTimer] = useState(120);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [formattedPhone, setFormattedPhone] = useState('');

  // Feedback e Loading
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Contador regressivo do código OTP (120 segundos)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsTimerActive(false);
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive, timer]);

  // Enviar solicitação inicial (E-mail ou WhatsApp)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (method === 'email' && !email) {
      setError('Por favor, informe seu endereço de e-mail.');
      return;
    }

    if (method === 'whatsapp' && !phone) {
      setError('Por favor, informe seu número de WhatsApp com DDD.');
      return;
    }

    setIsLoading(true);

    try {
      const payload =
        method === 'whatsapp'
          ? { phone, method: 'whatsapp' }
          : { email, method: 'email' };

      const res = await api.post('/auth/forgot-password', payload);

      if (res.data?.otpSent) {
        setOtpSent(true);
        setFormattedPhone(res.data.phone || phone);
        setTimer(120);
        setIsTimerActive(true);
      } else {
        setSuccessMessage(
          res.data?.message ||
            'Se este usuário estiver cadastrado, as instruções foram enviadas com sucesso.'
        );
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 'Ocorreu um erro ao processar a solicitação. Tente novamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Reenviar código OTP WhatsApp
  const handleResendOtp = async () => {
    setError(null);
    setIsLoading(true);

    try {
      await api.post('/auth/forgot-password', {
        phone: formattedPhone || phone,
        method: 'whatsapp',
      });
      setTimer(120);
      setIsTimerActive(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao reenviar o código. Aguarde alguns instantes.');
    } finally {
      setIsLoading(false);
    }
  };

  // Validar código OTP e redefinir senha imediatamente
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!otpCode || otpCode.length !== 5) {
      setError('O código de verificação deve conter 5 dígitos numéricos.');
      return;
    }

    if (newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('A confirmação da senha não confere com a nova senha digitada.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.post('/auth/reset-password-otp', {
        phone: formattedPhone || phone,
        code: otpCode,
        newPassword,
      });

      setSuccessMessage(
        res.data?.message || 'Sua senha foi redefinida com sucesso! Você já pode fazer login.'
      );
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 'Código inválido ou expirado. Solicite um novo código.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-slate-100/60 py-12">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Logo e Cabeçalho */}
        <div>
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={settings.appTitle}
              style={{ maxHeight: `${settings.logoHeight || 44}px` }}
              className="mx-auto object-contain mb-4"
            />
          ) : (
            <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 mb-4">
              <CheckSquare className="h-7 w-7" />
            </div>
          )}
          <h2
            style={{
              fontFamily: `'${settings.titleFontFamily || 'Inter'}', sans-serif`,
            }}
            className="text-2xl font-black text-slate-900 tracking-tight"
          >
            Recuperação de Senha
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {otpSent
              ? 'Digite o código recebido no seu WhatsApp e crie sua nova senha.'
              : 'Escolha a forma de recuperação desejada para redefinir seu acesso.'}
          </p>
        </div>

        {/* Card Principal */}
        <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/50 border border-slate-200/70 text-left">
          {/* SUCESSO TOTAL */}
          {successMessage ? (
            <div className="text-center py-4 space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {otpSent ? 'Senha Redefinida!' : 'Instruções Enviadas!'}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">{successMessage}</p>
              <div className="pt-4 border-t border-slate-100">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center w-full rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Ir para a tela de Login
                </Link>
              </div>
            </div>
          ) : otpSent ? (
            /* PASSO 2 WHATSAPP: VERIFICAÇÃO DO CÓDIGO OTP E NOVA SENHA */
            <div>
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Voltar e alterar telefone"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Código de Verificação</h3>
                  <p className="text-xs text-slate-500">
                    Enviamos um código de 5 dígitos para <strong>{formattedPhone}</strong>.
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                {/* Código OTP */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-center">
                    Código de 5 Dígitos *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="•••••"
                    className="w-full text-center font-mono text-2xl font-black tracking-[0.5em] py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Nova Senha */}
                <div className="relative">
                  <Input
                    label="Nova Senha"
                    type={showPassword ? 'text' : 'password'}
                    required
                    id="new-password"
                    placeholder="Mínimo 6 caracteres"
                    icon={<Lock className="h-4 w-4" />}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Confirmar Nova Senha */}
                <div>
                  <Input
                    label="Confirmar Nova Senha"
                    type={showPassword ? 'text' : 'password'}
                    required
                    id="confirm-password"
                    placeholder="Repita a nova senha"
                    icon={<Lock className="h-4 w-4" />}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                {/* Timer e Reenvio */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500">
                    {isTimerActive ? (
                      <span className="text-amber-600 font-semibold">
                        Expira em {timer}s
                      </span>
                    ) : (
                      <span className="text-rose-500 font-semibold">Código expirado</span>
                    )}
                  </span>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isTimerActive || isLoading}
                    className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reenviar código
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full mt-2"
                  size="lg"
                  isLoading={isLoading}
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  <span>Confirmar Nova Senha</span>
                </Button>
              </form>
            </div>
          ) : (
            /* PASSO 1: ESCOLHA ENTRE EMAIL OU WHATSAPP */
            <div>
              {/* Seletor de Abas (E-mail ou WhatsApp) */}
              <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setMethod('whatsapp');
                    setError(null);
                  }}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    method === 'whatsapp'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <MessageSquare className="h-4 w-4 text-emerald-600" />
                  <span>WhatsApp (OTP)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMethod('email');
                    setError(null);
                  }}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    method === 'email'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Mail className="h-4 w-4 text-blue-600" />
                  <span>E-mail (SMTP)</span>
                </button>
              </div>

              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {method === 'whatsapp' ? (
                  <div>
                    <Input
                      label="Seu WhatsApp Cadastrado"
                      type="text"
                      required
                      id="forgot-phone"
                      placeholder="Ex: 5519999486552 ou 19999486552"
                      icon={<Phone className="h-4 w-4 text-emerald-600" />}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Enviaremos um código numérico de 5 dígitos para você digitar nesta tela.
                    </span>
                  </div>
                ) : (
                  <div>
                    <Input
                      label="Seu E-mail Cadastrado"
                      type="email"
                      required
                      id="forgot-email"
                      placeholder="seu.email@senai.com"
                      icon={<Mail className="h-4 w-4 text-blue-600" />}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Enviaremos um link seguro para a sua caixa de entrada.
                    </span>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full mt-2"
                  size="lg"
                  isLoading={isLoading}
                >
                  <span>
                    {method === 'whatsapp'
                      ? 'Receber Código no WhatsApp'
                      : 'Enviar Link de Recuperação'}
                  </span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </form>
            </div>
          )}
        </div>

        <p className="text-sm text-slate-500">
          Lembrou a sua senha?{' '}
          <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
