import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class AskRequestDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(5000)
  prompt: string;
}
