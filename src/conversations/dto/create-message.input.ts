import { MessageRole } from '../message-role.enum';

export interface CreateMessageInput {
  content: string;
  conversationId: string;
  metadata?: Record<string, unknown> | null;
  role: MessageRole;
}
