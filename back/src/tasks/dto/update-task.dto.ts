import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateTaskDto {
  @ApiPropertyOptional({ example: 1, description: 'ID do usuário responsável' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'O ID do usuário deve ser um número.' })
  id_usuario?: number;

  @ApiPropertyOptional({ example: 'Atualizar documentação da API', description: 'Descrição da tarefa' })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto.' })
  descricao?: string;

  @ApiPropertyOptional({ example: 'Backend', description: 'Nome da equipe' })
  @IsOptional()
  @IsString({ message: 'A equipe deve ser um texto.' })
  equipe?: string;

  @ApiPropertyOptional({ example: 'média', description: 'Prioridade da tarefa' })
  @IsOptional()
  @IsString({ message: 'A prioridade deve ser um texto.' })
  prioridade?: string;

  @ApiPropertyOptional({ example: 'Em Desenvolvimento', description: 'Status atual' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: '2026-10-01T00:00:00.000Z', description: 'Data de previsão de início' })
  @IsOptional()
  @IsString()
  data_previsao_inicio?: string;

  @ApiPropertyOptional({ example: '2026-10-01T00:00:00.000Z', description: 'Data de início estimada ou real' })
  @IsOptional()
  @IsString()
  data_inicio?: string;

  @ApiPropertyOptional({ example: '2026-10-05T00:00:00.000Z', description: 'Data de previsão de término' })
  @IsOptional()
  @IsString()
  data_previsao_fim?: string;

  @ApiPropertyOptional({ example: '2026-10-05T00:00:00.000Z', description: 'Data efetiva de conclusão' })
  @IsOptional()
  @IsString()
  data_conclusao?: string;
}
