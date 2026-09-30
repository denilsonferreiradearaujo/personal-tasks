'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '../../components/layout/Navbar';
import { Sidebar } from '../../components/layout/Sidebar';
import { UserModal } from '../../components/users/UserModal';
import { Button } from '../../components/ui/Button';
import { User, UserRole } from '../../types';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  UserPlus,
  Trash2,
  Mail,
  Phone,
  Lock,
  ShieldCheck,
  Crown,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ShieldAlert,
  ArrowLeft,
} from 'lucide-react';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { formatDate, getInitials } from '../../lib/utils';

export default function UsuariosPage() {
  const router = useRouter();
  const { user: currentUser, isAuthenticated, loading: authLoading } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [userToDelete, setUserToDelete] = useState<{ id: number; nome: string } | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const isPrivileged = currentUser?.role === 'ADMIN' || currentUser?.role === 'ROOT';
  const isRoot = currentUser?.role === 'ROOT';

  const fetchUsers = useCallback(async () => {
    if (!isAuthenticated || !isPrivileged) {
      setUsers([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.get('/usuarios');
      const data = Array.isArray(res.data) ? res.data : res.data.users || [];
      setUsers(data);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, isPrivileged]);

  useEffect(() => {
    if (authLoading) return;

    if (isAuthenticated && isPrivileged) {
      fetchUsers();
    } else {
      setIsLoading(false);
    }
  }, [authLoading, isAuthenticated, isPrivileged, fetchUsers]);

  // Alternar status Ativo / Pendente
  const handleToggleStatus = async (id: number) => {
    try {
      setActionLoadingId(id);
      await api.patch(`/usuarios/${id}/status`);
      showToast('success', 'Status do usuário atualizado com sucesso!');
      await fetchUsers();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Erro ao alterar status do usuário.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Alterar cargo (exclusivo ROOT)
  const handleRoleChange = async (id: number, newRole: UserRole) => {
    try {
      setActionLoadingId(id);
      await api.patch(`/usuarios/${id}/role`, { role: newRole });
      showToast('success', 'Cargo do usuário atualizado com sucesso!');
      await fetchUsers();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Erro ao alterar cargo do usuário.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Confirmar exclusão de usuário
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      setIsDeletingUser(true);
      await api.delete(`/usuarios/${userToDelete.id}`);
      showToast('success', `Usuário "${userToDelete.nome}" excluído com sucesso.`);
      setUserToDelete(null);
      await fetchUsers();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Erro ao excluir usuário.');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleDeleteUser = (id: number, nome: string) => {
    setUserToDelete({ id, nome });
  };

  const filteredUsers = users.filter(
    (u) =>
      u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Lateral */}
      {isAuthenticated && (
        <Sidebar
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onToggleMobile={() => setIsMobileMenuOpen(true)} />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {authLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[500px]">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
              <p className="text-sm font-medium text-slate-500 mt-4">Verificando permissões...</p>
            </div>
          ) : !isAuthenticated ? (
            <div className="flex items-center justify-center min-h-[500px]">
              <div className="w-full max-w-md text-center p-8 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-4">
                  <Lock className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Acesso Restrito</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Você precisa estar autenticado para acessar a área de gestão de usuários.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center mt-6 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  Fazer login
                </Link>
              </div>
            </div>
          ) : !isPrivileged ? (
            <div className="flex items-center justify-center min-h-[500px]">
              <div className="w-full max-w-md text-center p-8 bg-white rounded-2xl border border-rose-100 shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
                  <ShieldAlert className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Acesso Negado</h2>
                <p className="mt-2 text-sm text-slate-500">
                  A gestão e visualização de usuários são reservadas apenas a <strong>Administradores</strong> e ao usuário <strong>Root</strong>.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 mt-6 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar ao Quadro Kanban
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="text-left">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Painel de Controle RBAC & Aprovações</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Gerenciamento de Usuários
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">
                    Aprove novos cadastros, atribua cargos administrativos e gerencie os acessos ao sistema.
                  </p>
                </div>

                <Button
                  onClick={() => setIsUserModalOpen(true)}
                  className="flex items-center gap-2 self-start md:self-auto"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Novo Usuário</span>
                </Button>
              </div>

              {/* Barra de Pesquisa */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm mb-6 max-w-md">
                <input
                  type="text"
                  placeholder="Filtrar por nome ou e-mail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Tabela de Usuários */}
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                  <p className="text-sm font-medium text-slate-500 mt-4">Carregando usuários...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
                  <Users className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                  <h3 className="text-base font-bold text-slate-800">Nenhum usuário encontrado</h3>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Cadastre o primeiro colaborador ou ajuste o filtro de pesquisa.
                  </p>
                  <Button onClick={() => setIsUserModalOpen(true)}>Cadastrar Novo Usuário</Button>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                  <div className="overflow-x-auto w-full">
                    <table className="min-w-[880px] w-full divide-y divide-slate-200 text-left">
                      <thead className="bg-slate-50/80">
                        <tr>
                          <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Usuário
                          </th>
                          <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            E-mail
                          </th>
                          <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Cargo (Role)
                          </th>
                          <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Status de Acesso
                          </th>
                          <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Tarefas
                          </th>
                          <th className="px-5 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredUsers.map((u) => {
                          const isTargetRoot = u.role === 'ROOT';
                          const isSelf = u.id_usuario === currentUser?.id_usuario;

                          return (
                            <tr key={u.id_usuario} className="hover:bg-slate-50/60 transition-colors">
                              {/* Nome e Avatar */}
                              <td className="px-5 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-3">
                                  <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center relative shrink-0">
                                    {getInitials(u.nome)}
                                    {isTargetRoot && (
                                      <span className="absolute -top-1 -right-1 bg-amber-500 text-white p-0.5 rounded-full" title="Root Admin">
                                        <Crown className="w-2.5 h-2.5" />
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                      {u.nome}
                                      {isSelf && (
                                        <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-semibold">
                                          Você
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-slate-400">ID #{u.id_usuario}</div>
                                  </div>
                                </div>
                              </td>

                              {/* Email e WhatsApp */}
                              <td className="px-5 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-1.5 text-sm text-slate-700">
                                  <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  <span>{u.email}</span>
                                </div>
                                {u.telefone && (
                                  <div className="flex items-center space-x-1.5 text-xs text-emerald-600 font-medium mt-1">
                                    <Phone className="h-3 w-3 text-emerald-500 shrink-0" />
                                    <span>+{u.telefone}</span>
                                  </div>
                                )}
                              </td>

                              {/* Cargo com Seletor para ROOT */}
                              <td className="px-4 py-4 whitespace-nowrap">
                                {isRoot && !isTargetRoot ? (
                                  <select
                                    value={u.role || 'USER'}
                                    onChange={(e) => handleRoleChange(u.id_usuario, e.target.value as UserRole)}
                                    disabled={actionLoadingId === u.id_usuario}
                                    className="text-xs font-semibold px-2 py-1 rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                  >
                                    <option value="USER">USER (Comum)</option>
                                    <option value="ADMIN">ADMIN (Administrador)</option>
                                  </select>
                                ) : (
                                  u.role === 'ROOT' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                      <Crown className="w-3 h-3 text-amber-600" /> ROOT
                                    </span>
                                  ) : u.role === 'ADMIN' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                      <ShieldCheck className="w-3 h-3 text-blue-600" /> ADMIN
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                                      USER
                                    </span>
                                  )
                                )}
                              </td>

                              {/* Status Ativo / Pendente com Botão de Aprovação */}
                              <td className="px-4 py-4 whitespace-nowrap">
                                {isTargetRoot ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                    <CheckCircle className="w-3 h-3" /> Sempre Ativo
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleToggleStatus(u.id_usuario)}
                                    disabled={actionLoadingId === u.id_usuario}
                                    title={u.ativo ? 'Clique para suspender' : 'Clique para aprovar o acesso'}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                                      u.ativo
                                        ? 'bg-emerald-100 text-emerald-800 hover:bg-rose-100 hover:text-rose-800'
                                        : 'bg-amber-100 text-amber-800 hover:bg-emerald-100 hover:text-emerald-800 animate-pulse'
                                    }`}
                                  >
                                    {u.ativo ? (
                                      <>
                                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                                        <span>Ativo (Aprovado)</span>
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="w-3 h-3 text-amber-600" />
                                        <span>Aguardando Aprovação (Aprovar)</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </td>

                              {/* Tarefas */}
                              <td className="px-4 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                                  {u._count?.tarefas ?? 0} tarefas
                                </span>
                              </td>

                              {/* Ações */}
                              <td className="px-5 py-4 whitespace-nowrap text-right text-sm">
                                <button
                                  onClick={() => handleDeleteUser(u.id_usuario, u.nome)}
                                  disabled={isTargetRoot || actionLoadingId === u.id_usuario}
                                  title={isTargetRoot ? 'Usuário Root não pode ser excluído' : 'Remover Usuário'}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    isTargetRoot
                                      ? 'text-slate-200 cursor-not-allowed'
                                      : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                  }`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {isAuthenticated && (
        <UserModal
          isOpen={isUserModalOpen}
          onClose={() => setIsUserModalOpen(false)}
          onSuccess={fetchUsers}
        />
      )}

      {/* Modal de Confirmação para Excluir Usuário */}
      <ConfirmModal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir Usuário"
        description={`Tem certeza que deseja excluir o usuário "${userToDelete?.nome}"? Todas as tarefas vinculadas a ele também serão excluídas.`}
        confirmText="Excluir Usuário"
        variant="danger"
        isLoading={isDeletingUser}
      />

      {/* Toast Informativo / Feedback */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
}