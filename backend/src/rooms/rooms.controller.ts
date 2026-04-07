import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { LeaveRoomDto } from './dto/leave-room.dto';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  listRooms() {
    return this.roomsService.listRooms();
  }

  @Get(':roomId')
  getRoom(@Param('roomId') roomId: string) {
    return this.roomsService.getRoom(roomId);
  }

  @Post()
  createRoom(@Body() payload: CreateRoomDto) {
    return this.roomsService.createRoom(payload);
  }

  @Post(':roomId/join')
  joinRoom(@Param('roomId') roomId: string, @Body() payload: JoinRoomDto) {
    return this.roomsService.joinRoom(roomId, payload);
  }

  @Post(':roomId/leave')
  leaveRoom(@Param('roomId') roomId: string, @Body() payload: LeaveRoomDto) {
    return this.roomsService.leaveRoom(roomId, payload.userId);
  }
}
