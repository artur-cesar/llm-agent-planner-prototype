import { Body, Controller, Post } from '@nestjs/common';

import type { AskRequestDto } from './dto/ask-request.dto';
import type { AskResponseDto } from './dto/ask-response.dto';

import { AskService } from './ask.service';

@Controller('ask')
export class AskController {
  constructor(private readonly askService: AskService) {}

  @Post()
  ask(@Body() input: AskRequestDto): Promise<AskResponseDto> {
    return this.askService.ask(input);
  }
}
