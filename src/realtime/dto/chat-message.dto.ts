import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ChatMessageDto {
  @IsString()
  roomId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  message!: string;
}
