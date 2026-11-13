import { Repository } from 'typeorm';

import { ConversationsService } from './conversations.service';
import { Conversation } from './entities/conversation.entity';

describe('ConversationsService', () => {
  it('should scope the database lookup to both conversation and owner', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const repository = { findOne } as unknown as Repository<Conversation>;
    const service = new ConversationsService(repository);

    await expect(
      service.findByIdAndUserId('conversation-1', 'user-A'),
    ).resolves.toBeNull();
    expect(findOne).toHaveBeenCalledWith({
      where: { id: 'conversation-1', userId: 'user-A' },
    });
  });
});
