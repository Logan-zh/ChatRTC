import { IsObject, IsString } from 'class-validator';

export class WebRtcOfferDto {
  @IsString()
  roomId!: string;

  @IsString()
  targetUserId!: string;

  @IsObject()
  sdp!: Record<string, unknown>;
}
