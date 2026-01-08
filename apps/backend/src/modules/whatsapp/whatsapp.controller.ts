import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('qr')
  async getQrCode() {
    return this.whatsappService.getQrCode();
  }

  @Get('status')
  async getStatus() {
    return this.whatsappService.getStatus();
  }
}
