import { ApiProperty } from '@nestjs/swagger';

export class AskResponseDto {
  @ApiProperty({
    description: 'Final assistant response for the executed turn.',
    example:
      'Order 123 is currently PAID. Order 123 contains: Keyboard, Mouse.',
  })
  content: string;

  @ApiProperty({
    description:
      'Conversation identifier to continue the same multi-turn conversation.',
    example: '8f38d9d4-a8d8-4d7f-8c8d-4f8a4e9f4b2d',
  })
  conversationId: string;
}
