'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import api from '../../services/api';
import { User } from '../../types';
import { Mail, Phone, Lock, User as UserIcon } from 'lucide-react';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: User | null;
  onSuccess: () => void;
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  userToEdit,
  onSuccess,
}) => {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (userToEdit) {
        setNome(userToEdit.nome || '');
        setEmail(userToEdit.email || '');
        setTelefone(userToEdit.telefone || '');
        setSenha('');
      } else {
        setNome('');
        setEmail('');
        setTelefone('');
        setSenha('');
      }
      setError(null);
    }
  }, [isOpen, userToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setError('O nome completo é obrigatório.');
      return;
    }

    if (!userToEdit && !email.trim()) {
      setError('O e-mail é obrigatório para novos usuários.');
      return;
    }

    if (senha && senha.length < 8) {
      setError('A senha deve possuir pelo menos 8 caracteres.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (userToEdit) {
        // Modo Edição
        const payload: { nome: string; telefone?: string; senha?: string } = {
          nome: nome.trim(),
          telefone: telefone.trim() || undefined,
        };

        if (senha.trim()) {
          payload.senha = senha.trim();
        }

        await api.patch(`/usuarios/${userToEdit.id_usuario}`, payload);
      } else {
        // Modo Criação
        await api.post('/usuarios', {
          nome: nome.trim(),
          email: email.trim(),
          telefone: telefone.trim() || undefined,
          senha: senha || '12345678',
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          (userToEdit ? 'Erro ao atualizar usuário.' : 'Erro ao cadastrar usuário.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isEditing = !!userToEdit;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Editar Usuário #${userToEdit.id_usuario}` : 'Cadastrar Novo Usuário'}
      description={
        isEditing
          ? 'Atualize as informações cadastrais e credenciais do usuário selecionado.'
          : 'Insira as credenciais do novo usuário para atribuição de tarefas no sistema.'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        {/* Nome Completo */}
        <Input
          label="Nome Completo *"
          required
          placeholder="Ex: Carlos Eduardo"
          icon={<UserIcon className="h-4 w-4" />}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />

        {/* E-mail (Editável se criação, Imutável se edição) */}
        {isEditing ? (
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Email (Imutável)
            </label>
            <div className="relative">
              <input
                type="email"
                disabled
                value={email}
                className="block w-full rounded-lg border border-slate-200 bg-slate-100/80 px-3.5 py-2 text-sm text-slate-500 cursor-not-allowed select-none pl-9"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              O e-mail é a chave de login do usuário e não pode ser alterado.
            </span>
          </div>
        ) : (
          <Input
            label="Email *"
            type="email"
            required
            placeholder="email@empresa.com"
            icon={<Mail className="h-4 w-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}

        {/* Telefone / WhatsApp */}
        <Input
          label="WhatsApp / Telefone com DDD (Opcional)"
          type="text"
          placeholder="Ex: (11) 99999-9999 ou 11999999999"
          icon={<Phone className="h-4 w-4" />}
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />

        {/* Senha */}
        <div>
          <Input
            label={isEditing ? 'Nova Senha de Acesso (Opcional)' : 'Senha de Acesso (Opcional)'}
            type="password"
            placeholder={isEditing ? 'Deixe em branco para não alterar' : 'Padrão: 12345678'}
            icon={<Lock className="h-4 w-4" />}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          {isEditing && (
            <span className="text-[11px] text-slate-400 mt-1 block">
              Preencha caso deseje redefinir a senha do usuário (mínimo 8 caracteres).
            </span>
          )}
        </div>

        <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading} className="min-w-[140px]">
            {isEditing ? 'Salvar Alterações' : 'Cadastrar Usuário'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
