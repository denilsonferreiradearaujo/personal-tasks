'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CheckSquare,
  Plus,
  LogOut,
  LogIn,
  Crown,
  Menu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { Button } from '../ui/Button';
import { getInitials } from '../../lib/utils';

interface NavbarProps {
  onOpenNewTask?: () => void;
  onToggleMobile?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenNewTask,
  onToggleMobile,
}) => {
  const pathname = usePathname();
  const { user, isAuthenticated, logout, loading } = useAuth();
  const { settings } = useSettings();

  const isRoot = user?.role === 'ROOT';

  const getPageTitle = () => {
    switch (pathname) {
      case '/':
        return 'Quadro de Tarefas (Kanban)';
      case '/gantt':
        return 'Gráfico de Gantt (Linha do Tempo)';
      case '/usuarios':
        return 'Gestão de Usuários';
      case '/configuracoes':
        return 'Configurações do Sistema';
      default:
        return settings.appTitle || 'Personal Tasks';
    }
  };

  return (
    <header className="sticky top-0 z-20 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* =====================================================
            ESQUERDA: TOGGLE MOBILE & TÍTULO DA PÁGINA
        ====================================================== */}
        <div className="flex items-center space-x-3">
          {isAuthenticated && onToggleMobile && (
            <button
              onClick={onToggleMobile}
              className="md:hidden p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              title="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          {/* Logo exibido apenas se não autenticado (quando não há sidebar) */}
          {!isAuthenticated ? (
            <Link href="/" className="flex items-center space-x-2.5">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.appTitle}
                  style={{ maxHeight: `${settings.logoHeight || 36}px` }}
                  className="object-contain"
                />
              ) : (
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-700 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                  <CheckSquare className="h-5 w-5" />
                </div>
              )}
              <span className="text-lg font-black tracking-tight text-slate-900">
                {settings.appTitle || 'Personal Tasks'}
              </span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800 hidden sm:inline">
                {getPageTitle()}
              </span>
            </div>
          )}
        </div>

        {/* =====================================================
            DIREITA: AÇÕES & PERFIL DO USUÁRIO
        ====================================================== */}
        <div className="flex items-center space-x-3">
          {loading ? (
            <div className="h-8 w-24 rounded-lg bg-slate-100 animate-pulse" />
          ) : isAuthenticated && user ? (
            <>
              {/* BOTÃO NOVA TAREFA (mantido no Header para fácil acesso) */}
              {onOpenNewTask && (
                <Button
                  onClick={onOpenNewTask}
                  size="sm"
                  className="inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nova Tarefa</span>
                </Button>
              )}

              {/* PERFIL DO USUÁRIO NO HEADER */}
              <div className="flex items-center pl-2 sm:pl-3 border-l border-slate-200 space-x-2.5">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-xs relative">
                    {getInitials(user.nome)}
                    {isRoot && (
                      <span
                        className="absolute -top-1 -right-1 bg-amber-500 text-white p-0.5 rounded-full shadow-xs"
                        title="Root Admin"
                      >
                        <Crown className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  <div className="hidden xl:block text-left">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-800 leading-tight">
                        {user.nome}
                      </span>
                      {user.role === 'ROOT' ? (
                        <span className="text-[9px] font-extrabold px-1 py-0.2 rounded bg-amber-100 text-amber-800 uppercase flex items-center gap-0.5">
                          <Crown className="w-2.5 h-2.5" /> ROOT
                        </span>
                      ) : user.role === 'ADMIN' ? (
                        <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-blue-100 text-blue-800 uppercase">
                          ADMIN
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
                      {user.email}
                    </span>
                  </div>
                </div>

                <button
                  onClick={logout}
                  title="Sair do sistema"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm" variant="primary" className="inline-flex items-center gap-1.5">
                <LogIn className="h-4 w-4" />
                <span>Entrar</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};