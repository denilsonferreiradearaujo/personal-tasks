import React from 'react';
import type { Metadata } from 'next';
import { AuthProvider } from '../context/AuthContext';
import { SettingsProvider } from '../context/SettingsContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Personal Tasks | Gestão Ágil de Tarefas',
  description: 'Sistema Kanban corporativo desenvolvido com NestJS, Next.js, Prisma ORM e MySQL.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-500 selection:text-white">
        <AuthProvider>
          <SettingsProvider>{children}</SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
