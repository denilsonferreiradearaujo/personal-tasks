'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

export interface PublicSettings {
  appTitle: string;
  logoUrl: string | null;
  logoHeight: number;
  titleFontSize: number;
  titleFontFamily: string;
  notificationChannel: string;
}

interface SettingsContextType {
  settings: PublicSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  updateLocalSettings: (newSettings: Partial<PublicSettings>) => void;
}

const defaultSettings: PublicSettings = {
  appTitle: 'Personal Tasks',
  logoUrl: null,
  logoHeight: 36,
  titleFontSize: 18,
  titleFontFamily: 'Inter',
  notificationChannel: 'SMTP',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<PublicSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchPublicSettings = async () => {
    try {
      const res = await api.get('/settings/public');
      if (res.data) {
        setSettings({
          appTitle: res.data.appTitle || 'Personal Tasks',
          logoUrl: res.data.logoUrl || null,
          logoHeight: res.data.logoHeight || 36,
          titleFontSize: res.data.titleFontSize || 18,
          titleFontFamily: res.data.titleFontFamily || 'Inter',
          notificationChannel: res.data.notificationChannel || 'SMTP',
        });
      }
    } catch (err) {
      console.error('Erro ao carregar configurações públicas da plataforma:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicSettings();
  }, []);

  // Atualiza dinamicamente o título da página no navegador
  useEffect(() => {
    if (typeof document !== 'undefined' && settings.appTitle) {
      document.title = `${settings.appTitle} - Gestão de Tarefas`;
    }
  }, [settings.appTitle]);

  const updateLocalSettings = (newSettings: Partial<PublicSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...newSettings,
    }));
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        refreshSettings: fetchPublicSettings,
        updateLocalSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings deve ser utilizado dentro de um SettingsProvider');
  }
  return context;
};
