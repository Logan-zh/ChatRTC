import { IsOptional, IsString, MaxLength } from 'class-validator';

export class JoinRoomDto {
  @IsString()
  @MaxLength(40)
  displayName!: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
