'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckSquare, Lock, Mail, User, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !email || !senha) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (senha.length < 4) {
      setError('A senha deve possuir pelo menos 4 caracteres.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await register(nome, email, senha);
      router.push('/');
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 'Falha ao realizar cadastro. Verifique os dados informados.'
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
            Crie sua conta
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Cadastre-se para acessar o quadro de gestão e atribuir tarefas à sua equipe.
          </p>
        </div>

        {/* Register Card */}
        <div className="rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/50 border border-slate-200/70">
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Input
              label="Nome Completo *"
              type="text"
              required
              id="register-nome"
              placeholder="Seu Nome Completo"
              icon={<User className="h-4 w-4" />}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />

            <Input
              label="E-mail Corporativo *"
              type="email"
              required
              id="register-email"
              placeholder="seu.email@senai.com"
              icon={<Mail className="h-4 w-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="Senha de Acesso *"
              type="password"
              required
              id="register-senha"
              placeholder="Mínimo 4 caracteres"
              icon={<Lock className="h-4 w-4" />}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />

            <Button
              type="submit"
              className="w-full mt-2"
              size="lg"
              isLoading={isLoading}
              id="btn-register-submit"
            >
              <span>Finalizar Cadastro</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </form>
        </div>

        {/* Login link */}
        <p className="text-sm text-slate-500">
          Já possui uma conta?{' '}
          <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
            Acessar conta existente
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
