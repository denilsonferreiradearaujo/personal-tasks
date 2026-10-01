'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { User as UserIcon, Mail, Phone, Lock, Crown, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user, updateUser } = useAuth();

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user && isOpen) {
      setNome(user.nome || '');
      setTelefone(user.telefone || '');
      setSenha('');
      setError(null);
      setSuccessMsg(null);
    }
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setError('O nome completo é obrigatório.');
      return;
    }

    if (senha && senha.length < 8) {
      setError('A nova senha deve possuir pelo menos 8 caracteres.');
      return;
    }

    if (!user) return;

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload: { nome: string; telefone?: string; senha?: string } = {
        nome: nome.trim(),
        telefone: telefone.trim() || undefined,
      };

      if (senha.trim()) {
        payload.senha = senha.trim();
      }

      const res = await api.patch(`/usuarios/${user.id_usuario}`, payload);
      const updatedData = res.data;

      // Atualiza o contexto do usuário autenticado e localStorage
      updateUser({
        nome: updatedData.nome,
        telefone: updatedData.telefone,
      });

      setSuccessMsg('Perfil atualizado com sucesso!');
      setSenha('');

      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Erro ao atualizar perfil:', err);
      setError(err.response?.data?.message || 'Falha ao salvar as alterações do perfil.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Meu Perfil"
      description="Gerencie suas informações cadastrais e credenciais de acesso."
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Resumo do Usuário (ID e Cargo) */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Identificação do Sistema
            </span>
            <span className="text-sm font-extrabold text-slate-800">
              Usuário #{user.id_usuario}
            </span>
          </div>
          <div>
            {user.role === 'ROOT' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 uppercase tracking-wide">
                <Crown className="w-3.5 h-3.5 text-amber-600" /> ROOT
              </span>
            ) : user.role === 'ADMIN' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 uppercase">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> ADMIN
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
                USER
              </span>
            )}
          </div>
        </div>

        {/* E-mail (Imutável) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            E-mail (Imutável)
          </label>
          <div className="relative">
            <input
              type="email"
              disabled
              value={user.email}
              className="block w-full rounded-lg border border-slate-200 bg-slate-100/80 px-3.5 py-2 text-sm text-slate-500 cursor-not-allowed select-none pl-9"
            />
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            O e-mail é utilizado para autenticação e não pode ser alterado.
          </span>
        </div>

        {/* Nome Completo (Editável) */}
        <Input
          label="Nome Completo *"
          type="text"
          required
          placeholder="Seu Nome Completo"
          icon={<UserIcon className="h-4 w-4" />}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />

        {/* Telefone / WhatsApp (Editável) */}
        <Input
          label="WhatsApp / Telefone com DDD (Opcional)"
          type="text"
          placeholder="Ex: (11) 99999-9999 ou 11999999999"
          icon={<Phone className="h-4 w-4" />}
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />

        {/* Nova Senha (Opcional) */}
        <div>
          <Input
            label="Nova Senha de Acesso (Opcional)"
            type="password"
            placeholder="Deixe em branco para manter a senha atual"
            icon={<Lock className="h-4 w-4" />}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          <span className="text-[11px] text-slate-400 mt-1 block">
            Preencha apenas se desejar redefinir sua senha (mínimo de 8 caracteres).
          </span>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading} className="min-w-[140px]">
            Salvar Alterações
          </Button>
        </div>
      </form>
    </Modal>
  );
};
