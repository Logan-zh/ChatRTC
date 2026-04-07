import { IsObject, IsString } from 'class-validator';

export class WebRtcAnswerDto {
  @IsString()
  roomId!: string;

  @IsString()
  targetUserId!: string;

  @IsObject()
  sdp!: Record<string, unknown>;
}
