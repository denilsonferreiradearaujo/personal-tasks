import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Obtém as configurações do sistema ou inicializa a linha padrão (ID 1)
   */
  async getOrCreateSettings() {
    let settings = await this.prisma.systemSettings.findUnique({
      where: { id: 1 },
    });

    if (!settings) {
      settings = await this.prisma.systemSettings.create({
        data: {
          id: 1,
          appTitle: 'Personal Tasks',
          logoHeight: 36,
          titleFontSize: 18,
          titleFontFamily: 'Inter',
          notificationChannel: 'SMTP',
          smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
          smtpPort: Number(process.env.SMTP_PORT) || 587,
          smtpUser: process.env.SMTP_USER || '',
          smtpPass: process.env.SMTP_PASS || '',
          smtpFrom: process.env.SMTP_FROM || 'Personal Tasks <no-reply@tasks.com>',
          whatsappUrl: process.env.WHATSAPP_URL || '',
          whatsappToken: process.env.WHATSAPP_TOKEN || '',
          whatsappInstance: process.env.WHATSAPP_INSTANCE || '',
        },
      });
    }

    return settings;
  }

  /**
   * Configurações públicas para a interface (carregamento de logo, título e canal ativo)
   */
  async getPublicSettings() {
    const s = await this.getOrCreateSettings();
    return {
      appTitle: s.appTitle,
      logoUrl: s.logoUrl,
      logoHeight: s.logoHeight,
      titleFontSize: s.titleFontSize,
      titleFontFamily: s.titleFontFamily,
      notificationChannel: s.notificationChannel,
    };
  }

  /**
   * Configurações completas para a tela de configurações (exclusivo ROOT)
   * Retorna senhas e tokens mascarados por segurança
   */
  async getAdminSettings() {
    const s = await this.getOrCreateSettings();
    return {
      ...s,
      smtpPass: s.smtpPass ? '••••••••' : '',
      whatsappToken: s.whatsappToken ? '••••••••••••••••' : '',
    };
  }

  /**
   * Atualiza as configurações do sistema (exclusivo ROOT)
   */
  async updateSettings(dto: UpdateSettingsDto) {
    const current = await this.getOrCreateSettings();

    const dataToUpdate: any = {
      appTitle: dto.appTitle !== undefined ? dto.appTitle : current.appTitle,
      logoUrl: dto.logoUrl !== undefined ? dto.logoUrl : current.logoUrl,
      logoHeight: dto.logoHeight !== undefined ? dto.logoHeight : current.logoHeight,
      titleFontSize: dto.titleFontSize !== undefined ? dto.titleFontSize : current.titleFontSize,
      titleFontFamily: dto.titleFontFamily !== undefined ? dto.titleFontFamily : current.titleFontFamily,
      notificationChannel: dto.notificationChannel !== undefined ? dto.notificationChannel : current.notificationChannel,
      smtpHost: dto.smtpHost !== undefined ? dto.smtpHost : current.smtpHost,
      smtpPort: dto.smtpPort !== undefined ? dto.smtpPort : current.smtpPort,
      smtpUser: dto.smtpUser !== undefined ? dto.smtpUser : current.smtpUser,
      smtpFrom: dto.smtpFrom !== undefined ? dto.smtpFrom : current.smtpFrom,
      whatsappUrl: dto.whatsappUrl !== undefined ? dto.whatsappUrl : current.whatsappUrl,
      whatsappInstance: dto.whatsappInstance !== undefined ? dto.whatsappInstance : current.whatsappInstance,
    };

    // Apenas atualiza a senha de SMTP se o usuário enviou um novo valor diferente de máscara
    if (dto.smtpPass && !dto.smtpPass.includes('•')) {
      dataToUpdate.smtpPass = dto.smtpPass;
    }

    // Apenas atualiza o token da Evolution API se o usuário enviou um novo valor diferente de máscara
    if (dto.whatsappToken && !dto.whatsappToken.includes('•')) {
      dataToUpdate.whatsappToken = dto.whatsappToken;
    }

    const updated = await this.prisma.systemSettings.update({
      where: { id: 1 },
      data: dataToUpdate,
    });

    this.logger.log('Configurações do sistema atualizadas com sucesso pelo ROOT.');
    return updated;
  }

  /**
   * Teste de envio de mensagem via Evolution API (WhatsApp)
   */
  async testWhatsApp(targetNumber: string, messageText?: string) {
    const s = await this.getOrCreateSettings();

    if (!s.whatsappUrl) {
      throw new BadRequestException('A URL da Evolution API não está configurada.');
    }

    // Normalização do número: remove caracteres não numéricos
    let cleanPhone = (targetNumber || '').replace(/\D/g, '');
    if (!cleanPhone.startsWith('55') && cleanPhone.length <= 11) {
      cleanPhone = `55${cleanPhone}`;
    }

    const textToSend =
      messageText ||
      `🤖 *Personal Tasks - Teste de Conexão*\n\nOlá! A integração do *WhatsApp (Evolution API)* com a sua plataforma foi configurada com sucesso!\n\n_Data/Hora: ${new Date().toLocaleString('pt-BR')}_`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (s.whatsappToken) {
      headers['apikey'] = s.whatsappToken;
    }

    const payload = {
      number: cleanPhone,
      text: textToSend,
    };

    let targetUrl = s.whatsappUrl.trim();
    if (!targetUrl.includes('/message/sendText')) {
      const cleanBase = targetUrl.replace(/\/+$/, '');
      const instance = (s.whatsappInstance || 'personal-tasks').trim();
      targetUrl = `${cleanBase}/message/sendText/${instance}`;
    }

    this.logger.log(`[WhatsApp Test] Enviando para: ${targetUrl} | Número: ${cleanPhone}`);

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      this.logger.log(`[WhatsApp Test] Resposta HTTP ${response.status}: ${responseText}`);

      if (!response.ok) {
        throw new BadRequestException(
          `Falha no envio pela Evolution API (HTTP ${response.status}): ${responseText}`,
        );
      }

      return {
        success: true,
        message: 'Mensagem de teste enviada com sucesso para o WhatsApp!',
        response: responseText,
      };
    } catch (err: any) {
      this.logger.error(`[WhatsApp Test] Erro: ${err.message}`);
      throw new BadRequestException(`Erro ao conectar com a Evolution API: ${err.message}`);
    }
  }

  /**
   * Teste de envio de e-mail via SMTP
   */
  async testSmtp(targetEmail: string) {
    const s = await this.getOrCreateSettings();

    if (!s.smtpHost || !s.smtpUser) {
      throw new BadRequestException('As credenciais de SMTP não estão configuradas.');
    }

    try {
      const transporter = nodemailer.createTransport({
        host: s.smtpHost,
        port: s.smtpPort || 587,
        secure: (s.smtpPort || 587) === 465,
        auth: {
          user: s.smtpUser,
          pass: s.smtpPass || '',
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      const mailOptions = {
        from: s.smtpFrom || `"Personal Tasks" <${s.smtpUser}>`,
        to: targetEmail,
        subject: `[Personal Tasks] Teste de Conexão SMTP`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #2563eb; margin-top: 0;">✅ Teste de E-mail Bem-Sucedido!</h2>
            <p>Olá,</p>
            <p>Este é um e-mail de teste disparado pelo painel de <strong>Configurações</strong> da sua plataforma <strong>${s.appTitle}</strong>.</p>
            <p>A conexão com o servidor SMTP (<code>${s.smtpHost}:${s.smtpPort}</code>) está funcionando perfeitamente!</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #64748b;">Enviado em: ${new Date().toLocaleString('pt-BR')}</p>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      this.logger.log(`[SMTP Test] E-mail enviado com sucesso para ${targetEmail}. MessageID: ${info.messageId}`);

      return {
        success: true,
        message: `E-mail de teste enviado com sucesso para ${targetEmail}!`,
        messageId: info.messageId,
      };
    } catch (err: any) {
      this.logger.error(`[SMTP Test] Erro: ${err.message}`);
      throw new BadRequestException(`Erro ao conectar ao servidor SMTP: ${err.message}`);
    }
  }
}
