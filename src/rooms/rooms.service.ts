import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';

type ParticipantRecord = {
  userId: string;
  displayName: string;
  socketId: string | null;
  isVideoEnabled: boolean;
  joinedAt: string;
};

type ChatMessageRecord = {
  id: string;
  userId: string;
  displayName: string;
  message: string;
  sentAt: string;
};

type RoomRecord = {
  id: string;
  name: string;
  createdAt: string;
  participants: Map<string, ParticipantRecord>;
  messages: ChatMessageRecord[];
};

export type ParticipantView = Omit<ParticipantRecord, 'socketId'>;

export type ChatMessageView = ChatMessageRecord;

export type RoomView = {
  id: string;
  name: string;
  createdAt: string;
  participants: ParticipantView[];
  messages: ChatMessageView[];
};

@Injectable()
export class RoomsService {
  private readonly rooms = new Map<string, RoomRecord>();

  listRooms(): RoomView[] {
    return Array.from(this.rooms.values())
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((room) => this.toRoomView(room));
  }

  getRoom(roomId: string): RoomView {
    return this.toRoomView(this.getRoomRecord(roomId));
  }

  createRoom(payload: CreateRoomDto): RoomView {
    const room: RoomRecord = {
      id: randomUUID(),
      name: payload.name.trim(),
      createdAt: new Date().toISOString(),
      participants: new Map<string, ParticipantRecord>(),
      messages: [],
    };

    this.rooms.set(room.id, room);
    return this.toRoomView(room);
  }

  joinRoom(roomId: string, payload: JoinRoomDto, socketId: string | null = null) {
    const room = this.getRoomRecord(roomId);
    const userId = payload.userId?.trim() || randomUUID();
    const participant: ParticipantRecord = {
      userId,
      displayName: payload.displayName.trim(),
      socketId,
      isVideoEnabled: room.participants.get(userId)?.isVideoEnabled ?? false,
      joinedAt: room.participants.get(userId)?.joinedAt ?? new Date().toISOString(),
    };

    room.participants.set(userId, participant);
    return {
      room: this.toRoomView(room),
      participant: this.toParticipantView(participant),
    };
  }

  leaveRoom(roomId: string, userId: string) {
    const room = this.getRoomRecord(roomId);
    const participant = room.participants.get(userId);
    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    room.participants.delete(userId);
    const roomView = this.toRoomView(room);
    if (room.participants.size === 0) {
      this.rooms.delete(roomId);
    }

    return {
      room: roomView,
      participant: this.toParticipantView(participant),
      deleted: room.participants.size === 0,
    };
  }

  disconnectSocket(socketId: string) {
    for (const room of this.rooms.values()) {
      for (const participant of room.participants.values()) {
        if (participant.socketId === socketId) {
          room.participants.delete(participant.userId);
          const deleted = room.participants.size === 0;
          if (deleted) {
            this.rooms.delete(room.id);
          }

          return {
            roomId: room.id,
            participant: this.toParticipantView(participant),
            deleted,
            room: deleted ? null : this.toRoomView(room),
          };
        }
      }
    }

    return null;
  }

  addMessage(roomId: string, userId: string, messageText: string) {
    const room = this.getRoomRecord(roomId);
    const participant = room.participants.get(userId);
    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    const message: ChatMessageRecord = {
      id: randomUUID(),
      userId: participant.userId,
      displayName: participant.displayName,
      message: messageText.trim(),
      sentAt: new Date().toISOString(),
    };

    room.messages.push(message);
    if (room.messages.length > 200) {
      room.messages.splice(0, room.messages.length - 200);
    }

    return message;
  }

  updateMediaState(roomId: string, userId: string, isVideoEnabled: boolean) {
    const participant = this.getParticipantRecord(roomId, userId);
    participant.isVideoEnabled = isVideoEnabled;
    return this.toParticipantView(participant);
  }

  getParticipantSocket(roomId: string, userId: string) {
    const participant = this.getParticipantRecord(roomId, userId);
    if (!participant.socketId) {
      throw new NotFoundException('Participant socket not found');
    }

    return participant.socketId;
  }

  private getRoomRecord(roomId: string): RoomRecord {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  private getParticipantRecord(roomId: string, userId: string): ParticipantRecord {
    const room = this.getRoomRecord(roomId);
    const participant = room.participants.get(userId);
    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    return participant;
  }

  private toRoomView(room: RoomRecord): RoomView {
    return {
      id: room.id,
      name: room.name,
      createdAt: room.createdAt,
      participants: Array.from(room.participants.values()).map((participant) =>
        this.toParticipantView(participant),
      ),
      messages: [...room.messages],
    };
  }

  private toParticipantView(participant: ParticipantRecord): ParticipantView {
    return {
      userId: participant.userId,
      displayName: participant.displayName,
      isVideoEnabled: participant.isVideoEnabled,
      joinedAt: participant.joinedAt,
    };
  }
}
