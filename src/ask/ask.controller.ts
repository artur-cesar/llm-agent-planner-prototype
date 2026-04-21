import { Body, Controller, Post } from '@nestjs/common';

import { AskService } from './ask.service';
import { AskRequestDto } from './dto/ask-request.dto';
import { AskResponseDto } from './dto/ask-response.dto';

@Controller('ask')
export class AskController {
  constructor(private readonly askService: AskService) {}

  @Post()
  ask(@Body() input: AskRequestDto): Promise<AskResponseDto> {
    return this.askService.ask(input);
  }
}
