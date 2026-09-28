import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  TestSmtpDto,
  TestWhatsAppDto,
  UpdateSettingsDto,
} from './dto/update-settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('Configurações do Sistema')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('public')
  @ApiOperation({ summary: 'Obter dados públicos de identidade visual (Logo, título e canal)' })
  async getPublicSettings() {
    return this.settingsService.getPublicSettings();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROOT')
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Obter configurações completas do sistema (exclusivo ROOT)' })
  async getAdminSettings() {
    return this.settingsService.getAdminSettings();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROOT')
  @ApiBearerAuth()
  @Put()
  @ApiOperation({ summary: 'Atualizar configurações do sistema (exclusivo ROOT)' })
  async updateSettings(@Body() updateSettingsDto: UpdateSettingsDto) {
    return this.settingsService.updateSettings(updateSettingsDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROOT')
  @ApiBearerAuth()
  @Post('test-whatsapp')
  @ApiOperation({ summary: 'Disparar mensagem de teste via Evolution API WhatsApp (exclusivo ROOT)' })
  async testWhatsApp(@Body() testDto: TestWhatsAppDto) {
    return this.settingsService.testWhatsApp(testDto.number, testDto.text);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROOT')
  @ApiBearerAuth()
  @Post('test-smtp')
  @ApiOperation({ summary: 'Disparar e-mail de teste via SMTP (exclusivo ROOT)' })
  async testSmtp(@Body() testDto: TestSmtpDto) {
    return this.settingsService.testSmtp(testDto.email);
  }
}
