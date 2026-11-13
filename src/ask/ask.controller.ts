import { Body, Controller, Headers, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiConflictResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { AskService } from './ask.service';
import { AskRequestDto } from './dto/ask-request.dto';
import { AskResponseDto } from './dto/ask-response.dto';

@ApiTags('ask')
@Controller('ask')
export class AskController {
  constructor(private readonly askService: AskService) {}

  @Post()
  @ApiOperation({
    summary: 'Submit a user prompt to the planner-backed ask flow',
    description:
      'Starts or continues a multi-turn conversation. The assistant may answer directly, ask for clarification, or execute one or more tools before returning the final response.',
  })
  @ApiHeader({
    name: 'x-user-id',
    required: false,
    description:
      'Optional simulated user identifier used to create and access conversations. Reuse the same identifier for follow-up turns; omitted or blank values use anonymous-user. This header is not authentication.',
    example: 'user-123',
  })
  @ApiConflictResponse({
    description:
      'Another turn is already running for this conversation in this application process.',
  })
  @ApiBody({ type: AskRequestDto })
  @ApiOkResponse({
    description:
      'Final assistant response for the current turn, including the conversation ID for follow-up turns.',
    type: AskResponseDto,
  })
  ask(
    @Body() input: AskRequestDto,
    @Headers('x-user-id') userId?: string,
  ): Promise<AskResponseDto> {
    return this.askService.ask(input, userId);
  }
}
