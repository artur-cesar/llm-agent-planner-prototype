import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { MessageRole } from '../message-role.enum';
import { Conversation } from './conversation.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ enum: MessageRole, type: 'enum' })
  role: MessageRole;

  @Column({ nullable: true, type: 'jsonb' })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @ManyToOne(() => Conversation, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
