'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckSquare, Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError('Token de redefinição não encontrado. Solicite um novo link.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('A confirmação da senha não coincide com a nova senha.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await api.post('/auth/reset-password', {
        token,
        newPassword,
      });
      setSuccessMessage(
        res.data?.message || 'Sua senha foi redefinida com sucesso!'
      );
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 'Falha ao redefinir a senha. O link pode ter expirado.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center py-4 space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Link Inválido ou Ausente</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          Nenhum token de redefinição foi fornecido na URL.
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Solicitar novo link
        </Link>
      </div>
    );
  }

  return (
    <div>
      {successMessage ? (
        <div className="text-center py-4 space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Senha Alterada!</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            {successMessage}
          </p>
          <div className="pt-4 border-t border-slate-100">
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Fazer login com a nova senha
              <ArrowRight className="h-4 w-4 ml-2" />
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
            label="Nova Senha"
            type="password"
            required
            id="reset-new-password"
            placeholder="No mínimo 6 caracteres"
            icon={<Lock className="h-4 w-4" />}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <Input
            label="Confirmar Nova Senha"
            type="password"
            required
            id="reset-confirm-password"
            placeholder="Repita a nova senha"
            icon={<Lock className="h-4 w-4" />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <Button
            type="submit"
            className="w-full mt-2"
            size="lg"
            isLoading={isLoading}
          >
            <span>Salvar Nova Senha</span>
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-slate-100/60 py-12">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Logo Header */}
        <div>
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 mb-4">
            <CheckSquare className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Criar Nova Senha
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Digite sua nova senha de acesso ao Personal Tasks.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/50 border border-slate-200/70">
          <Suspense fallback={<div className="py-8 text-center text-slate-400">Carregando formulário...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
