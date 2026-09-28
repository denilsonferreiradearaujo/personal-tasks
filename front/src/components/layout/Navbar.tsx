'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CheckSquare,
  LayoutGrid,
  Users,
  Plus,
  LogOut,
  LogIn,
  UserPlus,
  ShieldCheck,
  Crown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { getInitials } from '../../lib/utils';

interface NavbarProps {
  onOpenNewTask?: () => void;
  onOpenNewUser?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenNewTask,
  onOpenNewUser,
}) => {
  const pathname = usePathname();
  const { user, isAuthenticated, logout, loading } = useAuth();

  const isAdminOrRoot = user?.role === 'ADMIN' || user?.role === 'ROOT';
  const isRoot = user?.role === 'ROOT';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* =====================================================
            BRAND & NAVEGAÇÃO
        ====================================================== */}
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-700 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                SENAI <span className="text-blue-600 font-bold">Tasks</span>
              </span>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block -mt-1 tracking-wider">
                Simulado SAEP
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-1">
            {/* Quadro Kanban - acessível */}
            <Link
              href="/"
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              <span>Quadro Kanban</span>
            </Link>

            {/* Usuários - VISÍVEL APENAS PARA ADMIN E ROOT */}
            {isAuthenticated && isAdminOrRoot && (
              <Link
                href="/usuarios"
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === '/usuarios'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Gestão de Usuários</span>
              </Link>
            )}
          </nav>
        </div>

        {/* =====================================================
            AÇÕES & PERFIL DO USUÁRIO
        ====================================================== */}
        <div className="flex items-center space-x-3">
          {loading ? (
            <div className="hidden sm:block h-8 w-20 rounded-lg bg-slate-100 animate-pulse" />
          ) : isAuthenticated && user ? (
            <>
              {/* BOTÃO NOVA TAREFA */}
              {onOpenNewTask && (
                <Button
                  onClick={onOpenNewTask}
                  size="sm"
                  className="hidden sm:inline-flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nova Tarefa</span>
                </Button>
              )}

              {/* BOTÃO NOVO USUÁRIO (APENAS ADMIN/ROOT) */}
              {isAdminOrRoot && onOpenNewUser && (
                <Button
                  onClick={onOpenNewUser}
                  variant="outline"
                  size="sm"
                  className="hidden sm:inline-flex items-center gap-1.5"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Novo Usuário</span>
                </Button>
              )}

              {/* PERFIL DO USUÁRIO */}
              <div className="flex items-center pl-3 border-l border-slate-200 space-x-3">
                <div className="flex items-center space-x-2.5">
                  <div className="h-8 w-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-sm relative">
                    {getInitials(user.nome)}
                    {isRoot && (
                      <span className="absolute -top-1 -right-1 bg-amber-500 text-white p-0.5 rounded-full" title="Root Admin">
                        <Crown className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  <div className="hidden lg:block text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800 leading-tight">
                        {user.nome}
                      </span>
                      {user.role === 'ROOT' ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 uppercase flex items-center gap-0.5">
                          <Crown className="w-2.5 h-2.5" /> ROOT
                        </span>
                      ) : user.role === 'ADMIN' ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 uppercase flex items-center gap-0.5">
                          <ShieldCheck className="w-2.5 h-2.5" /> ADMIN
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[11px] text-slate-400 leading-tight">
                      {user.email}
                    </div>
                  </div>
                </div>

                {/* LOGOUT */}
                <button
                  onClick={logout}
                  title="Sair da Conta"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            /* NÃO AUTENTICADO */
            <div className="flex items-center space-x-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="flex items-center gap-1.5">
                  <LogIn className="h-4 w-4" />
                  <span>Entrar</span>
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" size="sm">
                  Registrar
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};