import { IsObject, IsString } from 'class-validator';

export class WebRtcCandidateDto {
  @IsString()
  roomId!: string;

  @IsString()
  targetUserId!: string;

  @IsObject()
  candidate!: Record<string, unknown>;
}
