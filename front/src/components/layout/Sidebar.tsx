'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CheckSquare,
  LayoutGrid,
  CalendarRange,
  Users,
  Settings,
  Crown,
  ChevronLeft,
  ChevronRight,
  Shield,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Carrega e sincroniza o estado salvo no localStorage
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('personal_tasks_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch (e) {
      // Ignora erro em ambientes restritos
    }
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('personal_tasks_sidebar_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

  if (!isAuthenticated || !user) return null;

  const isAdminOrRoot = user.role === 'ADMIN' || user.role === 'ROOT';
  const isRoot = user.role === 'ROOT';

  const navItems = [
    {
      label: 'Quadro Kanban',
      href: '/',
      icon: LayoutGrid,
      visible: true,
    },
    {
      label: 'Gráfico de Gantt',
      href: '/gantt',
      icon: CalendarRange,
      visible: true,
    },
    {
      label: 'Gestão de Usuários',
      href: '/usuarios',
      icon: Users,
      visible: isAdminOrRoot,
    },
    {
      label: 'Configurações',
      href: '/configuracoes',
      icon: Settings,
      visible: isRoot,
      badge: 'ROOT',
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200/80 shadow-xs select-none">
      {/* =========================================================
          TOP: LOGO E TÍTULO DINÂMICO DA PLATAFORMA
      ========================================================== */}
      <div className={`flex items-center h-16 px-4 border-b border-slate-200/80 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <Link href="/" className="flex items-center gap-3 overflow-hidden group">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={settings.appTitle}
              style={{ maxHeight: `${Math.min(settings.logoHeight || 36, 44)}px` }}
              className="object-contain shrink-0 transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-700 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0 group-hover:scale-105 transition-transform">
              <CheckSquare className="h-5 w-5" />
            </div>
          )}

          {!isCollapsed && (
            <div className="overflow-hidden">
              <span
                style={{
                  fontFamily: `'${settings.titleFontFamily || 'Inter'}', sans-serif`,
                  fontSize: `${Math.min(settings.titleFontSize || 18, 20)}px`,
                }}
                className="font-black tracking-tight text-slate-900 block truncate"
              >
                {settings.appTitle || 'Personal Tasks'}
              </span>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block -mt-1 tracking-wider">
                Workspace Ágil
              </span>
            </div>
          )}
        </Link>

        {/* Botão de fechar mobile */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* =========================================================
          MIDDLE: ITENS DE NAVEGAÇÃO
      ========================================================== */}
      <div
        className={`flex-1 py-4 space-y-2 overflow-x-hidden ${
          isCollapsed ? 'px-2 overflow-y-hidden' : 'px-3 overflow-y-auto'
        }`}
      >
        {!isCollapsed && (
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Navegação Principal
          </div>
        )}

        {navItems
          .filter((item) => item.visible)
          .map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-xl font-medium text-sm transition-all duration-150 group relative ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                } ${
                  isCollapsed
                    ? 'w-11 h-11 mx-auto justify-center p-0'
                    : 'px-3 py-2.5'
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 transition-colors ${
                    isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />

                {!isCollapsed && (
                  <span className="flex-1 truncate">{item.label}</span>
                )}

                {!isCollapsed && item.badge && (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200/80 flex items-center gap-0.5 shrink-0">
                    <Crown className="w-2.5 h-2.5 text-amber-600" />
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
      </div>

      {/* =========================================================
          BOTTOM: TOGGLE DE COLAPSAR / EXPANDIR
      ========================================================== */}
      <div className="border-t border-slate-200/80 p-2.5 bg-slate-50/50">
        {/* Botão de colapsar / expandir (desktop) */}
        <div className="hidden md:flex justify-end">
          <button
            onClick={toggleCollapsed}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-200/60 transition-colors w-full justify-center"
            title={isCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="text-[11px] font-semibold text-slate-500">Recolher menu</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Sidebar Desktop */}
      <aside
        className={`hidden md:block shrink-0 transition-all duration-200 h-screen sticky top-0 z-30 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Sidebar Mobile (Gaveta deslizante) */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
          />

          {/* Drawer */}
          <div className="relative w-72 max-w-[85vw] h-full z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
