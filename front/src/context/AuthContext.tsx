// 'use client';

// import React, { createContext, useContext, useEffect, useState } from 'react';
// import api from '../services/api';
// import { AuthResponse, User } from '../types';

// interface AuthContextType {
//   user: User | null;
//   token: string | null;
//   loading: boolean;
//   login: (email: string, senha: string) => Promise<void>;
//   register: (nome: string, email: string, senha: string) => Promise<void>;
//   logout: () => void;
//   isAuthenticated: boolean;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//   const [user, setUser] = useState<User | null>(null);
//   const [token, setToken] = useState<string | null>(null);
//   const [loading, setLoading] = useState<boolean>(true);

//   useEffect(() => {
//     const storedToken = localStorage.getItem('token');
//     const storedUser = localStorage.getItem('user');

//     if (storedToken && storedUser) {
//       try {
//         setToken(storedToken);
//         setUser(JSON.parse(storedUser));
//       } catch (err) {
//         localStorage.removeItem('token');
//         localStorage.removeItem('user');
//       }
//     }
//     setLoading(false);
//   }, []);

//   const login = async (email: string, senha: string) => {
//     const response = await api.post<AuthResponse>('/auth/login', { email, senha });
//     const { user: loggedUser, access_token } = response.data;

//     setToken(access_token);
//     setUser(loggedUser);
//     localStorage.setItem('token', access_token);
//     localStorage.setItem('user', JSON.stringify(loggedUser));
//   };

//   const register = async (nome: string, email: string, senha: string) => {
//     const response = await api.post<AuthResponse>('/auth/register', { nome, email, senha });
//     const { user: registeredUser, access_token } = response.data;

//     setToken(access_token);
//     setUser(registeredUser);
//     localStorage.setItem('token', access_token);
//     localStorage.setItem('user', JSON.stringify(registeredUser));
//   };

//   const logout = () => {
//     setToken(null);
//     setUser(null);
//     localStorage.removeItem('token');
//     localStorage.removeItem('user');
//   };

//   return (
//     <AuthContext.Provider
//       value={{
//         user,
//         token,
//         loading,
//         login,
//         register,
//         logout,
//         isAuthenticated: !!token,
//       }}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
//   }
//   return context;
// };



'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import api from '../services/api';

import { AuthResponse, User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;

  login: (email: string, senha: string) => Promise<void>;

  register: (
    nome: string,
    email: string,
    senha: string,
    telefone?: string
  ) => Promise<void>;

  logout: () => void;

  updateUser: (updatedUser: Partial<User>) => void;

  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  /**
   * Recupera a sessão salva no navegador.
   */
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error(
        'Erro ao recuperar sessão:',
        err
      );

      localStorage.removeItem('token');
      localStorage.removeItem('user');

      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Login
   */
  const login = async (
    email: string,
    senha: string
  ) => {
    const response = await api.post<AuthResponse>(
      '/auth/login',
      {
        email,
        senha,
      }
    );

    const {
      user: loggedUser,
      access_token,
    } = response.data;

    setToken(access_token);
    setUser(loggedUser);

    localStorage.setItem(
      'token',
      access_token
    );

    localStorage.setItem(
      'user',
      JSON.stringify(loggedUser)
    );
  };

  /**
   * Cadastro
   */
  const register = async (
    nome: string,
    email: string,
    senha: string,
    telefone?: string
  ) => {
    const response = await api.post<AuthResponse>(
      '/auth/register',
      {
        nome,
        email,
        senha,
        telefone: telefone ? telefone.trim() : undefined,
      }
    );

    const {
      user: registeredUser,
      access_token,
    } = response.data;

    setToken(access_token);
    setUser(registeredUser);

    localStorage.setItem(
      'token',
      access_token
    );

    localStorage.setItem(
      'user',
      JSON.stringify(registeredUser)
    );
  };

  /**
   * Logout
   */
  const logout = () => {
    setToken(null);
    setUser(null);

    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  /**
   * Atualizar dados locais da sessão do usuário
   */
  const updateUser = (updatedUser: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const merged = { ...prev, ...updatedUser };
      try {
        localStorage.setItem('user', JSON.stringify(merged));
      } catch (err) {
        console.error('Erro ao atualizar user no localStorage:', err);
      }
      return merged;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateUser,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth deve ser utilizado dentro de um AuthProvider'
    );
  }

  return context;
};

