'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckSquare, Mail, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, informe seu endereço de e-mail.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setSuccessMessage(
        res.data?.message ||
          'Se este e-mail estiver cadastrado, as instruções e o link de recuperação foram enviados com sucesso.'
      );
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 'Ocorreu um erro ao processar a solicitação. Tente novamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-slate-100/60 py-12">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Logo Header */}
        <div>
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 mb-4">
            <CheckSquare className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Recuperação de Senha
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Digite seu e-mail cadastrado para receber o link de redefinição de senha.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/50 border border-slate-200/70">
          {successMessage ? (
            <div className="text-center py-4 space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">E-mail Enviado!</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {successMessage}
              </p>
              <div className="pt-4 border-t border-slate-100">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center w-full rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar para o Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Input
                label="Seu E-mail Cadastrado"
                type="email"
                required
                id="forgot-email"
                placeholder="seu.email@senai.com"
                icon={<Mail className="h-4 w-4" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Button
                type="submit"
                className="w-full mt-2"
                size="lg"
                isLoading={isLoading}
              >
                <span>Enviar Link de Recuperação</span>
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </form>
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
