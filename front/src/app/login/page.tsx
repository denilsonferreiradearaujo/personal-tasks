'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckSquare, Lock, Mail, ArrowRight, AlertCircle, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !senha) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await login(email, senha);
      router.push('/');
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 'Falha na autenticação. Verifique seu e-mail e senha.'
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
            Acesse sua conta
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Entre com suas credenciais para gerenciar suas tarefas e equipes.
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/50 border border-slate-200/70">
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Input
              label="E-mail"
              type="email"
              required
              id="login-email"
              placeholder="seu.email@senai.com"
              icon={<Mail className="h-4 w-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Senha de Acesso</label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Esqueci a senha
                </Link>
              </div>
              <Input
                type="password"
                required
                id="login-senha"
                placeholder="••••••••"
                icon={<Lock className="h-4 w-4" />}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              size="lg"
              isLoading={isLoading}
              id="btn-login-submit"
            >
              <span>Entrar no Sistema</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </form>
        </div>

        {/* Registration link */}
        <p className="text-sm text-slate-500">
          Ainda não possui uma conta?{' '}
          <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700">
            Cadastre-se gratuitamente
          </Link>
        </p>

        <p className="text-xs text-slate-400">
          <Link href="/" className="hover:underline">
            Voltar para o Quadro de Tarefas
          </Link>
        </p>
      </div>
    </div>
  );
}
