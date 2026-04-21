import { Body, Controller, Get, Post } from '@nestjs/common';

import { AppService } from './app.service';
import { AskRequestDto } from './ask/dto/ask-request.dto';
import { AskResponseDto } from './ask/dto/ask-response.dto';

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
