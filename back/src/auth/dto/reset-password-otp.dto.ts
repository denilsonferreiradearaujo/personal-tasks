import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordOtpDto {
  @ApiProperty({ example: '5519999486552', description: 'Telefone do WhatsApp com DDD' })
  @IsNotEmpty({ message: 'O telefone é obrigatório.' })
  @IsString()
  phone: string;

  @ApiProperty({ example: '12345', description: 'Código OTP de 5 dígitos' })
  @IsNotEmpty({ message: 'O código de verificação é obrigatório.' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'novasenha123', description: 'Nova senha do usuário (mínimo 6 caracteres)' })
  @IsNotEmpty({ message: 'A nova senha é obrigatória.' })
  @IsString()
  @MinLength(6, { message: 'A nova senha deve ter no mínimo 6 caracteres.' })
  newPassword: string;
}
