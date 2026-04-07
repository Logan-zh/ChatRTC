import { IsString } from 'class-validator';

export class LeaveRoomDto {
  @IsString()
  userId!: string;
}
