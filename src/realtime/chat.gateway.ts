import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JoinRoomDto } from '../rooms/dto/join-room.dto';
import { RoomsService } from '../rooms/rooms.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { ParticipantMediaDto } from './dto/participant-media.dto';
import { SocketJoinRoomDto } from './dto/socket-join-room.dto';
import { WebRtcAnswerDto } from './dto/webrtc-answer.dto';
import { WebRtcCandidateDto } from './dto/webrtc-candidate.dto';
import { WebRtcOfferDto } from './dto/webrtc-offer.dto';

type SocketState = {
  roomId?: string;
  userId?: string;
  displayName?: string;
};

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
export class ChatGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly roomsService: RoomsService) {}

  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @MessageBody() payload: SocketJoinRoomDto,
    @ConnectedSocket() client: Socket,
  ) {
    const joinPayload: JoinRoomDto = {
      displayName: payload.displayName,
      userId: payload.userId,
    };
    const result = this.roomsService.joinRoom(payload.roomId, joinPayload, client.id);

    await client.join(payload.roomId);

    const state = client.data as SocketState;
    state.roomId = payload.roomId;
    state.userId = result.participant.userId;
    state.displayName = result.participant.displayName;

    client.emit('room:joined', result);
    client.to(payload.roomId).emit('room:presence', {
      type: 'joined',
      participant: result.participant,
      roomId: payload.roomId,
    });

    return result;
  }

  @SubscribeMessage('room:leave')
  async handleLeaveRoom(@ConnectedSocket() client: Socket) {
    const state = client.data as SocketState;
    if (!state.roomId || !state.userId) {
      return { ok: true };
    }

    await client.leave(state.roomId);
    const result = this.roomsService.leaveRoom(state.roomId, state.userId);
    client.to(state.roomId).emit('room:presence', {
      type: 'left',
      participant: result.participant,
      roomId: state.roomId,
      deleted: result.deleted,
    });
    state.roomId = undefined;
    state.userId = undefined;
    state.displayName = undefined;

    return result;
  }

  @SubscribeMessage('chat:send')
  handleChatMessage(
    @MessageBody() payload: ChatMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const state = client.data as SocketState;
    const userId = state.userId;
    if (!userId) {
      return { error: 'Socket has not joined a room' };
    }

    const message = this.roomsService.addMessage(payload.roomId, userId, payload.message);
    this.server.to(payload.roomId).emit('chat:message', message);
    return message;
  }

  @SubscribeMessage('participant:media')
  handleParticipantMedia(
    @MessageBody() payload: ParticipantMediaDto,
    @ConnectedSocket() client: Socket,
  ) {
    const state = client.data as SocketState;
    if (!state.userId) {
      return { error: 'Socket has not joined a room' };
    }

    const participant = this.roomsService.updateMediaState(
      payload.roomId,
      state.userId,
      payload.isVideoEnabled,
    );

    this.server.to(payload.roomId).emit('participant:media', {
      roomId: payload.roomId,
      participant,
    });

    return participant;
  }

  @SubscribeMessage('webrtc:offer')
  handleOffer(
    @MessageBody() payload: WebRtcOfferDto,
    @ConnectedSocket() client: Socket,
  ) {
    this.forwardToPeer('webrtc:offer', payload.roomId, payload.targetUserId, {
      roomId: payload.roomId,
      fromUserId: (client.data as SocketState).userId,
      fromDisplayName: (client.data as SocketState).displayName,
      sdp: payload.sdp,
    });

    return { ok: true };
  }

  @SubscribeMessage('webrtc:answer')
  handleAnswer(
    @MessageBody() payload: WebRtcAnswerDto,
    @ConnectedSocket() client: Socket,
  ) {
    this.forwardToPeer('webrtc:answer', payload.roomId, payload.targetUserId, {
      roomId: payload.roomId,
      fromUserId: (client.data as SocketState).userId,
      fromDisplayName: (client.data as SocketState).displayName,
      sdp: payload.sdp,
    });

    return { ok: true };
  }

  @SubscribeMessage('webrtc:ice-candidate')
  handleIceCandidate(
    @MessageBody() payload: WebRtcCandidateDto,
    @ConnectedSocket() client: Socket,
  ) {
    this.forwardToPeer('webrtc:ice-candidate', payload.roomId, payload.targetUserId, {
      roomId: payload.roomId,
      fromUserId: (client.data as SocketState).userId,
      fromDisplayName: (client.data as SocketState).displayName,
      candidate: payload.candidate,
    });

    return { ok: true };
  }

  handleDisconnect(client: Socket) {
    const result = this.roomsService.disconnectSocket(client.id);
    if (!result) {
      return;
    }

    this.server.to(result.roomId).emit('room:presence', {
      type: 'left',
      participant: result.participant,
      roomId: result.roomId,
      deleted: result.deleted,
    });
  }

  private forwardToPeer(
    eventName: string,
    roomId: string,
    targetUserId: string,
    payload: Record<string, unknown>,
  ) {
    const targetSocketId = this.roomsService.getParticipantSocket(roomId, targetUserId);
    this.server.to(targetSocketId).emit(eventName, payload);
  }
}
