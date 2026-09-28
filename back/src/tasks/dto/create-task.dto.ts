import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTaskDto {
  @ApiPropertyOptional({ example: 1, description: 'ID do usuário responsável (opcional se autenticado)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'O ID do usuário deve ser um número.' })
  id_usuario?: number;

  @ApiProperty({ example: 'Implementar autenticação JWT', description: 'Descrição da tarefa' })
  @IsString({ message: 'A descrição deve ser um texto.' })
  @IsNotEmpty({ message: 'A descrição é obrigatória.' })
  descricao: string;

  @ApiProperty({ example: 'Backend', description: 'Nome da equipe ou squad' })
  @IsString({ message: 'A equipe deve ser um texto.' })
  @IsNotEmpty({ message: 'A equipe é obrigatória.' })
  equipe: string;

  @ApiProperty({ example: 'alta', description: 'Prioridade da tarefa (baixa, média, alta)' })
  @IsString({ message: 'A prioridade deve ser um texto.' })
  @IsNotEmpty({ message: 'A prioridade é obrigatória.' })
  prioridade: string;

  @ApiPropertyOptional({ example: 'Não Iniciado', description: 'Status inicial da tarefa' })
  @IsOptional()
  @IsString()
  status?: string;
}
