import { Module } from '@nestjs/common';
import { RoomsController } from './rooms/rooms.controller';
import { RoomsService } from './rooms/rooms.service';
import { ChatGateway } from './realtime/chat.gateway';

@Module({
  controllers: [RoomsController],
  providers: [RoomsService, ChatGateway],
})
export class AppModule {}
