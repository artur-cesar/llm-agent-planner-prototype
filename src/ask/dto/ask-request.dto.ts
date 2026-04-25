import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AskRequestDto {
  @ApiPropertyOptional({
    description:
      'Continue an existing conversation by reusing the stored context.',
    example: '8f38d9d4-a8d8-4d7f-8c8d-4f8a4e9f4b2d',
  })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiProperty({
    description:
      'User prompt for a new or existing conversation turn. It may trigger direct answers, clarifications, or tool-backed planning.',
    example: 'What is the status and items of order 123?',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(5000)
  prompt: string;
}
