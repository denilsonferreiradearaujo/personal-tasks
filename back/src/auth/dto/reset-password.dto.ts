import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'a1b2c3d4...', description: 'Token de recuperação recebido no link' })
  @IsNotEmpty({ message: 'Token é obrigatório.' })
  token: string;

  @ApiProperty({ example: 'novaSenha123', description: 'Nova senha desejada' })
  @IsNotEmpty({ message: 'Nova senha é obrigatória.' })
  @MinLength(6, { message: 'A nova senha deve ter no mínimo 6 caracteres.' })
  newPassword: string;
}
