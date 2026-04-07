import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SocketJoinRoomDto {
  @IsString()
  roomId!: string;

  @IsString()
  @MaxLength(40)
  displayName!: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
