'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Image as ImageIcon,
  MessageSquare,
  Mail,
  Save,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Trash2,
  Upload,
  Send,
  Crown,
  Sparkles,
  Layers,
  CheckSquare,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { Navbar } from '../../components/layout/Navbar';
import { Sidebar } from '../../components/layout/Sidebar';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api from '../../services/api';

const FONT_OPTIONS = [
  'Inter',
  'Poppins',
  'Outfit',
  'Montserrat',
  'Roboto',
  'Open Sans',
  'Lato',
  'Nunito',
  'Raleway',
];

export default function SettingsPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { updateLocalSettings } = useSettings();
  const router = useRouter();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Estados do formulário
  const [appTitle, setAppTitle] = useState('Personal Tasks');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoHeight, setLogoHeight] = useState(36);
  const [titleFontSize, setTitleFontSize] = useState(18);
  const [titleFontFamily, setTitleFontFamily] = useState('Inter');
  const [notificationChannel, setNotificationChannel] = useState<'SMTP' | 'WHATSAPP' | 'BOTH'>('SMTP');

  // WhatsApp Evolution API
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [whatsappToken, setWhatsappToken] = useState('');
  const [whatsappInstance, setWhatsappInstance] = useState('');
  const [showWhatsappToken, setShowWhatsappToken] = useState(false);

  // SMTP E-mail
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [showSmtpPass, setShowSmtpPass] = useState(false);

  // Estados de controle e feedback
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados de teste de WhatsApp
  const [testNumber, setTestNumber] = useState('5519999486552');
  const [isTestingWhatsApp, setIsTestingWhatsApp] = useState(false);
  const [waTestResult, setWaTestResult] = useState<string | null>(null);

  // Estados de teste de SMTP
  const [testEmail, setTestEmail] = useState('');
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<string | null>(null);

  // Verificação de permissão ROOT
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || user?.role !== 'ROOT') {
        router.push('/');
      }
    }
  }, [authLoading, isAuthenticated, user, router]);

  // Carregar dados da API
  useEffect(() => {
    if (isAuthenticated && user?.role === 'ROOT') {
      loadSettings();
    }
  }, [isAuthenticated, user]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/settings');
      const data = res.data;

      if (data) {
        setAppTitle(data.appTitle || 'Personal Tasks');
        setLogoUrl(data.logoUrl || null);
        setLogoHeight(data.logoHeight || 36);
        setTitleFontSize(data.titleFontSize || 18);
        setTitleFontFamily(data.titleFontFamily || 'Inter');
        setNotificationChannel(data.notificationChannel || 'SMTP');

        setWhatsappUrl(data.whatsappUrl || '');
        setWhatsappToken(data.whatsappToken || '');
        setWhatsappInstance(data.whatsappInstance || '');

        setSmtpHost(data.smtpHost || '');
        setSmtpPort(data.smtpPort || 587);
        setSmtpUser(data.smtpUser || '');
        setSmtpPass(data.smtpPass || '');
        setSmtpFrom(data.smtpFrom || '');

        if (data.smtpUser && !testEmail) {
          setTestEmail(data.smtpUser);
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar configurações:', err);
      setFeedback({
        type: 'error',
        text: 'Não foi possível carregar as configurações do sistema.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Upload e conversão do logotipo para Base64
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setFeedback({ type: 'error', text: 'O arquivo de imagem deve ter no máximo 2MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setLogoUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  // Salvar configurações
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const payload: any = {
        appTitle: appTitle.trim(),
        logoUrl,
        logoHeight: Number(logoHeight),
        titleFontSize: Number(titleFontSize),
        titleFontFamily,
        notificationChannel,
        smtpHost: smtpHost.trim(),
        smtpPort: Number(smtpPort),
        smtpUser: smtpUser.trim(),
        smtpFrom: smtpFrom.trim(),
        whatsappUrl: whatsappUrl.trim(),
        whatsappInstance: whatsappInstance.trim(),
      };

      // Envia senha / token apenas se não forem a máscara
      if (smtpPass && !smtpPass.includes('•')) {
        payload.smtpPass = smtpPass;
      }
      if (whatsappToken && !whatsappToken.includes('•')) {
        payload.whatsappToken = whatsappToken;
      }

      await api.put('/settings', payload);

      // Atualiza o contexto global para refletir instantaneamente na Sidebar e Header
      updateLocalSettings({
        appTitle: payload.appTitle,
        logoUrl: payload.logoUrl,
        logoHeight: payload.logoHeight,
        titleFontSize: payload.titleFontSize,
        titleFontFamily: payload.titleFontFamily,
        notificationChannel: payload.notificationChannel,
      });

      setFeedback({
        type: 'success',
        text: 'Configurações atualizadas com sucesso! As alterações visuais foram aplicadas instantaneamente.',
      });

      // Recarrega as configurações para restabelecer máscaras
      await loadSettings();
    } catch (err: any) {
      console.error(err);
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || 'Erro ao salvar as configurações.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Testar disparo de WhatsApp
  const handleTestWhatsApp = async () => {
    if (!testNumber) {
      setWaTestResult('Informe o número com DDD para teste.');
      return;
    }

    setIsTestingWhatsApp(true);
    setWaTestResult(null);

    try {
      const res = await api.post('/settings/test-whatsapp', {
        number: testNumber,
        text: `🤖 *${appTitle} - Teste de Envio*\n\nParabéns! Sua integração com a Evolution API WhatsApp está configurada e operando perfeitamente.`,
      });
      setWaTestResult(`✅ ${res.data.message || 'Mensagem enviada com sucesso!'}`);
    } catch (err: any) {
      setWaTestResult(`❌ ${err.response?.data?.message || 'Falha ao conectar com a Evolution API.'}`);
    } finally {
      setIsTestingWhatsApp(false);
    }
  };

  // Testar disparo de E-mail SMTP
  const handleTestSmtp = async () => {
    if (!testEmail) {
      setSmtpTestResult('Informe o e-mail de destino para o teste.');
      return;
    }

    setIsTestingSmtp(true);
    setSmtpTestResult(null);

    try {
      const res = await api.post('/settings/test-smtp', {
        email: testEmail,
      });
      setSmtpTestResult(`✅ ${res.data.message || 'E-mail enviado com sucesso!'}`);
    } catch (err: any) {
      setSmtpTestResult(`❌ ${err.response?.data?.message || 'Falha ao conectar ao servidor SMTP.'}`);
    } finally {
      setIsTestingSmtp(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Carregando painel de configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Lateral */}
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onToggleMobile={() => setIsMobileMenuOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
          {/* Header da Página */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <Settings className="h-6 w-6" />
                </span>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Configurações do Sistema
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                  <Crown className="w-3 h-3 text-amber-600" />
                  ROOT ONLY
                </span>
              </div>
              <p className="text-sm text-slate-500">
                Personalize a identidade visual, logotipo corporativo e canais de envio (WhatsApp Evolution API & SMTP).
              </p>
            </div>
          </div>

          {/* Feedback Toast / Alert */}
          {feedback && (
            <div
              className={`mb-6 p-4 rounded-xl border flex items-center gap-3 shadow-xs animate-in fade-in duration-200 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
              )}
              <span className="text-sm font-medium">{feedback.text}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* =========================================================================
                CARD 1: IDENTIDADE VISUAL & LOGOTIPO (CONCEITO SEP)
            ========================================================================== */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 text-left">
              <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-100">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Identidade Visual & Logotipo</h2>
                  <p className="text-xs text-slate-500">Defina o nome da plataforma, tipografia e logo exibido na barra lateral e cabeçalho.</p>
                </div>
              </div>

              <div className="space-y-5">
                {/* Título da Plataforma */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Título da Plataforma *
                  </label>
                  <input
                    type="text"
                    required
                    value={appTitle}
                    onChange={(e) => setAppTitle(e.target.value)}
                    placeholder="Ex: SENAI Tasks / Workspace Corporativo"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Exibido no topo do menu lateral, na barra superior e na aba do navegador.
                  </span>
                </div>

                {/* Controles de Fonte */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Fonte do Título
                    </label>
                    <select
                      value={titleFontFamily}
                      onChange={(e) => setTitleFontFamily(e.target.value)}
                      style={{ fontFamily: titleFontFamily }}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f} value={f} style={{ fontFamily: f }}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700">Tamanho da Fonte</label>
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                        {titleFontSize}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={14}
                      max={26}
                      step={1}
                      value={titleFontSize}
                      onChange={(e) => setTitleFontSize(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>14px (Discreto)</span>
                      <span>20px (Padrão)</span>
                      <span>26px (Destaque)</span>
                    </div>
                  </div>
                </div>

                {/* Upload e Configuração do Logotipo */}
                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Logotipo da Empresa
                  </label>

                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    {/* Área de Preview da Logo */}
                    <div className="w-36 h-28 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center p-3 relative overflow-hidden shrink-0 group">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt="Logo Preview"
                          style={{ maxHeight: `${logoHeight}px` }}
                          className="object-contain"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-400">
                          <ImageIcon className="h-6 w-6 stroke-1" />
                          <span className="text-[10px]">Sem logo</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-3 w-full">
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors shadow-2xs">
                          <Upload className="h-4 w-4 text-slate-500" />
                          <span>Selecionar Imagem (PNG/JPG/SVG)</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>

                        {logoUrl && (
                          <button
                            type="button"
                            onClick={() => setLogoUrl(null)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Remover Logo</span>
                          </button>
                        )}
                      </div>

                      {/* Controle de Altura do Logo */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-600 font-medium">Altura do Logotipo</span>
                          <span className="text-xs font-bold text-blue-600">{logoHeight}px</span>
                        </div>
                        <input
                          type="range"
                          min={24}
                          max={56}
                          step={2}
                          value={logoHeight}
                          onChange={(e) => setLogoHeight(Number(e.target.value))}
                          className="w-full accent-blue-600 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Preview Card */}
                <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center gap-3 shadow-md">
                  <div className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded">
                    Live Preview (Sidebar)
                  </div>
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo"
                        style={{ maxHeight: `${logoHeight}px` }}
                        className="object-contain shrink-0"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-700 to-sky-500 flex items-center justify-center text-white shrink-0">
                        <CheckSquare className="h-4 w-4" />
                      </div>
                    )}
                    <span
                      style={{
                        fontFamily: `'${titleFontFamily}', sans-serif`,
                        fontSize: `${titleFontSize}px`,
                      }}
                      className="font-bold truncate text-white"
                    >
                      {appTitle || 'Personal Tasks'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* =========================================================================
                CARD 2: SELETOR DE CANAL DE NOTIFICAÇÃO
            ========================================================================== */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 text-left">
              <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-100">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Canal Principal de Envio</h2>
                  <p className="text-xs text-slate-500">Escolha como o sistema deve disparar as instruções de redefinição de senha e alertas.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Opção SMTP */}
                <div
                  onClick={() => setNotificationChannel('SMTP')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    notificationChannel === 'SMTP'
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-bold text-slate-900">Apenas E-mail (SMTP)</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Dispara links de recuperação diretamente para a caixa postal do usuário via Nodemailer.
                  </p>
                </div>

                {/* Opção WhatsApp */}
                <div
                  onClick={() => setNotificationChannel('WHATSAPP')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    notificationChannel === 'WHATSAPP'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm font-bold text-slate-900">Apenas WhatsApp</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Dispara o link de redefinição para o WhatsApp do usuário através da Evolution API.
                  </p>
                </div>

                {/* Opção Ambos */}
                <div
                  onClick={() => setNotificationChannel('BOTH')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    notificationChannel === 'BOTH'
                      ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-bold text-slate-900">E-mail + WhatsApp</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Tenta enviar prioritariamente pelo WhatsApp e envia também uma cópia no e-mail.
                  </p>
                </div>
              </div>
            </div>

            {/* =========================================================================
                CARD 3: WHATSAPP (EVOLUTION API)
            ========================================================================== */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 text-left">
              <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-100">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Integração WhatsApp (Evolution API)</h2>
                  <p className="text-xs text-slate-500">Conecte sua instância da Evolution API para envio de mensagens automáticas no WhatsApp.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    URL de Envio da Evolution API
                  </label>
                  <input
                    type="text"
                    value={whatsappUrl}
                    onChange={(e) => setWhatsappUrl(e.target.value)}
                    placeholder="https://evolutionapi.vps6663.panel.icontainer.run"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-xs"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    URL base da sua Evolution API (ou o endpoint completo com <code>/message/sendText/nome-da-instancia</code>).
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      API Key / Token da Instância
                    </label>
                    <div className="relative">
                      <input
                        type={showWhatsappToken ? 'text' : 'password'}
                        value={whatsappToken}
                        onChange={(e) => setWhatsappToken(e.target.value)}
                        placeholder="••••••••••••••••"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 pr-10 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowWhatsappToken(!showWhatsappToken)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        {showWhatsappToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Nome da Instância
                    </label>
                    <input
                      type="text"
                      value={whatsappInstance}
                      onChange={(e) => setWhatsappInstance(e.target.value)}
                      placeholder="Ex: SEP_sistem-embeded-panel"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs"
                    />
                  </div>
                </div>

                {/* Box de Teste de WhatsApp */}
                <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/80 p-4 rounded-xl">
                  <span className="text-xs font-bold text-slate-800 block mb-2">
                    Testar Conexão WhatsApp em Tempo Real
                  </span>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="text"
                      value={testNumber}
                      onChange={(e) => setTestNumber(e.target.value)}
                      placeholder="5519999486552 (DDI + DDD + Número)"
                      className="w-full sm:w-72 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleTestWhatsApp}
                      disabled={isTestingWhatsApp}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{isTestingWhatsApp ? 'Enviando...' : 'Enviar Teste WhatsApp'}</span>
                    </button>
                  </div>
                  {waTestResult && (
                    <div className="mt-2 text-xs font-medium text-slate-700 p-2 rounded-lg bg-white border border-slate-200">
                      {waTestResult}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* =========================================================================
                CARD 4: E-MAIL (GMAIL SMTP)
            ========================================================================== */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 text-left">
              <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-100">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Configuração de E-mail (Gmail SMTP)</h2>
                  <p className="text-xs text-slate-500">Credenciais para envio de e-mails transacionais e links de recuperação de senha.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Servidor SMTP (Host)
                    </label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.gmail.com"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Porta
                    </label>
                    <input
                      type="number"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(Number(e.target.value))}
                      placeholder="587"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Usuário / E-mail do Remetente
                    </label>
                    <input
                      type="email"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="seu.email@gmail.com"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Senha de Aplicativo (App Password)
                    </label>
                    <div className="relative">
                      <input
                        type={showSmtpPass ? 'text' : 'password'}
                        value={smtpPass}
                        onChange={(e) => setSmtpPass(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 pr-10 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmtpPass(!showSmtpPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        {showSmtpPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Nome de Exibição do Remetente (From)
                  </label>
                  <input
                    type="text"
                    value={smtpFrom}
                    onChange={(e) => setSmtpFrom(e.target.value)}
                    placeholder='"Personal Tasks" <denilson.ferreiradearaujo@gmail.com>'
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Box de Teste de SMTP */}
                <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/80 p-4 rounded-xl">
                  <span className="text-xs font-bold text-slate-800 block mb-2">
                    Testar Envio de E-mail SMTP
                  </span>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="email-de-teste@exemplo.com"
                      className="w-full sm:w-72 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={handleTestSmtp}
                      disabled={isTestingSmtp}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{isTestingSmtp ? 'Enviando...' : 'Enviar Teste E-mail'}</span>
                    </button>
                  </div>
                  {smtpTestResult && (
                    <div className="mt-2 text-xs font-medium text-slate-700 p-2 rounded-lg bg-white border border-slate-200">
                      {smtpTestResult}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Botão de Salvar Alterações */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                type="submit"
                size="lg"
                isLoading={isSaving}
                className="inline-flex items-center gap-2 px-6 shadow-md"
              >
                <Save className="h-4 w-4" />
                <span>Salvar Configurações</span>
              </Button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
