import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: 'Personal Tasks' })
  @IsOptional()
  @IsString()
  appTitle?: string;

  @ApiPropertyOptional({ example: 'data:image/png;base64,...' })
  @IsOptional()
  @IsString()
  logoUrl?: string | null;

  @ApiPropertyOptional({ example: 36 })
  @IsOptional()
  @IsNumber()
  logoHeight?: number;

  @ApiPropertyOptional({ example: 18 })
  @IsOptional()
  @IsNumber()
  titleFontSize?: number;

  @ApiPropertyOptional({ example: 'Inter' })
  @IsOptional()
  @IsString()
  titleFontFamily?: string;

  @ApiPropertyOptional({ example: 'SMTP', enum: ['SMTP', 'WHATSAPP', 'BOTH'] })
  @IsOptional()
  @IsString()
  notificationChannel?: string;

  // SMTP
  @ApiPropertyOptional({ example: 'smtp.gmail.com' })
  @IsOptional()
  @IsString()
  smtpHost?: string;

  @ApiPropertyOptional({ example: 587 })
  @IsOptional()
  @IsNumber()
  smtpPort?: number;

  @ApiPropertyOptional({ example: 'seu-email@gmail.com' })
  @IsOptional()
  @IsString()
  smtpUser?: string;

  @ApiPropertyOptional({ example: 'sua-senha-de-app' })
  @IsOptional()
  @IsString()
  smtpPass?: string;

  @ApiPropertyOptional({ example: '"Personal Tasks" <seu-email@gmail.com>' })
  @IsOptional()
  @IsString()
  smtpFrom?: string;

  // Evolution API
  @ApiPropertyOptional({ example: 'https://evolutionapi.../message/sendText/instancia' })
  @IsOptional()
  @IsString()
  whatsappUrl?: string;

  @ApiPropertyOptional({ example: 'apikey-evolution' })
  @IsOptional()
  @IsString()
  whatsappToken?: string;

  @ApiPropertyOptional({ example: 'SEP_sistem-embeded-panel' })
  @IsOptional()
  @IsString()
  whatsappInstance?: string;
}

export class TestWhatsAppDto {
  @ApiPropertyOptional({ example: '5519999486552' })
  @IsString()
  number: string;

  @ApiPropertyOptional({ example: 'Mensagem de teste' })
  @IsOptional()
  @IsString()
  text?: string;
}

export class TestSmtpDto {
  @ApiPropertyOptional({ example: 'usuario@exemplo.com' })
  @IsString()
  email: string;
}
