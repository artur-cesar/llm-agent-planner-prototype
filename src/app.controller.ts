import { Body, Controller, Get, Post } from '@nestjs/common';

import type { AskRequestDto } from './ask/dto/ask-request.dto';
import type { AskResponseDto } from './ask/dto/ask-response.dto';

import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('ask')
  ask(@Body() input: AskRequestDto): Promise<AskResponseDto> {
    return this.appService.ask(input);
  }
}
