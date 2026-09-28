import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @ApiPropertyOptional({ example: 'usuario@senai.com', description: 'E-mail do usuário para envio do link' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '5519999486552', description: 'Número do WhatsApp com DDD' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'whatsapp', description: 'Método de envio: email ou whatsapp' })
  @IsOptional()
  @IsString()
  method?: 'email' | 'whatsapp';
}
