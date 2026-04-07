import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../messages/message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
  ) {}

  async saveMessage(data: {
    roomId: string;
    content: string;
    sender: string;
  }): Promise<Message> {
    const message = this.messagesRepository.create(data);
    return this.messagesRepository.save(message);
  }

  async getRoomMessages(roomId: string): Promise<Message[]> {
    return this.messagesRepository.find({
      where: { roomId },
      order: { createdAt: 'ASC' },
      take: 100,
    });
  }
}
