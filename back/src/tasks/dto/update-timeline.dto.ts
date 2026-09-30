import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateTimelineDto {
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
