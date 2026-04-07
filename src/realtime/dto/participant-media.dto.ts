import { IsBoolean, IsString } from 'class-validator';

export class ParticipantMediaDto {
  @IsString()
  roomId!: string;

  @IsBoolean()
  isVideoEnabled!: boolean;
}
