import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateMessageInput } from './dto/create-message.input';
import { Message } from './entities/message.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
  ) {}

  async create(input: CreateMessageInput): Promise<Message> {
    const message = this.messagesRepository.create({
      content: input.content,
      conversationId: input.conversationId,
      metadata: input.metadata ?? null,
      role: input.role,
    });

    return this.messagesRepository.save(message);
  }

  async createMany(inputs: CreateMessageInput[]): Promise<void> {
    await this.messagesRepository.manager.transaction(async (manager) => {
      const repository = manager.getRepository(Message);
      for (const input of inputs) {
        await repository.save(
          repository.create({ ...input, metadata: input.metadata ?? null }),
        );
      }
    });
  }

  async findByConversationId(conversationId: string): Promise<Message[]> {
    return this.messagesRepository.find({
      order: { sequence: 'ASC' },
      where: { conversationId },
    });
  }
}
