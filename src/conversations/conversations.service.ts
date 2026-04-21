import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateConversationInput } from './dto/create-conversation.input';
import { Conversation } from './entities/conversation.entity';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationsRepository: Repository<Conversation>,
  ) {}

  async create(input: CreateConversationInput): Promise<Conversation> {
    const conversation = this.conversationsRepository.create({
      systemPrompt: input.systemPrompt ?? null,
      userId: input.userId,
    });

    return this.conversationsRepository.save(conversation);
  }

  async findById(id: string): Promise<Conversation | null> {
    return this.conversationsRepository.findOne({ where: { id } });
  }
}
