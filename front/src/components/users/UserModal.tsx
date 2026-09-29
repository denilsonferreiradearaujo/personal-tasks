'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import api from '../../services/api';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) {
      setError('Nome e e-mail são obrigatórios.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.post('/usuarios', {
        nome: nome.trim(),
        email: email.trim(),
        telefone: telefone.trim() || undefined,
        senha: senha || '123456',
      });

      setNome('');
      setEmail('');
      setTelefone('');
      setSenha('');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Erro ao cadastrar usuário.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cadastrar Novo Usuário"
      description="Insira as credenciais do novo usuário para atribuição de tarefas no sistema."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        <Input
          label="Nome Completo *"
          required
          placeholder="Ex: Carlos Eduardo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />

        <Input
          label="Email *"
          type="email"
          required
          placeholder="email@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          label="WhatsApp / Telefone com DDD (Opcional)"
          type="text"
          placeholder="Ex: 5519999486552 ou 19999486552"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />

        <Input
          label="Senha de Acesso (Opcional)"
          type="password"
          placeholder="Padrão: 123456"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Cadastrar Usuário
          </Button>
        </div>
      </form>
    </Modal>
  );
};
