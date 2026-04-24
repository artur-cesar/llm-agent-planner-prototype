import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AskRequestDto {
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(5000)
  prompt: string;
}
