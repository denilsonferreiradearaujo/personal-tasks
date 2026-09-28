import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateStatusDto {
  @ApiProperty({ example: 'Em Desenvolvimento', description: 'Novo status da tarefa' })
  @IsString({ message: 'O status deve ser uma cadeia de texto.' })
  @IsNotEmpty({ message: 'O status é obrigatório.' })
  status: string;
}
