export type Priority = 'baixa' | 'média' | 'alta' | string;
export type TaskStatus = 'Não Iniciado' | 'Em Desenvolvimento' | 'Finalizado' | string;
export type UserRole = 'ROOT' | 'ADMIN' | 'USER';

export interface User {
  id_usuario: number;
  nome: string;
  email: string;
  role?: UserRole;
  ativo?: boolean;
  data_criacao?: string;
  _count?: {
    tarefas: number;
  };
}

export interface TaskComment {
  id_comentario: number;
  id_tarefa: number;
  id_usuario: number;
  conteudo: string;
  tipo: 'TEXT' | 'IMAGE' | 'FILE' | string;
  arquivo_url?: string | null;
  arquivo_nome?: string | null;
  data_criacao: string;
  data_atualizacao?: string;
  usuario?: {
    id_usuario: number;
    nome: string;
    email: string;
    role?: UserRole;
  };
}

export interface TaskShare {
  id: number;
  id_tarefa: number;
  email: string;
  id_usuario?: number | null;
  data_compartilhamento: string;
}

export interface Task {
  id_tarefa: number;
  id_usuario: number;
  descricao: string;
  equipe: string;
  prioridade: Priority;
  status: TaskStatus;
  isCompartilhada?: boolean;
  shareToken?: string;
  data_cadastro?: string;
  nome?: string; // Nome do criador
  email?: string;
  totalComentarios?: number;
  totalCompartilhamentos?: number;
  isOwner?: boolean;
  isSharedWithMe?: boolean;
  comentarios?: TaskComment[];
  compartilhamentos?: TaskShare[];
}

export interface AuthResponse {
  user: User;
  access_token: string;
  message?: string;
}
