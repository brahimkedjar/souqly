import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

const createMockSocket = () => {
  return {
    data: { user: { id: 'user-1' } },
    emit: jest.fn(),
    id: 'socket-1',
  } as any;
};

describe('ChatGateway', () => {
  it('emits ack on message', async () => {
    const chatService = {
      createMessage: jest.fn().mockResolvedValue({ id: 'msg-1', text: 'hello' }),
    } as unknown as ChatService;

    const gateway = new ChatGateway(
      {} as any,
      { get: jest.fn() } as any,
      chatService,
      { user: { findUnique: jest.fn().mockResolvedValue({ isBanned: false }) } } as any,
    );
    gateway.server = {
      to: jest.fn().mockReturnValue({ except: jest.fn().mockReturnValue({ emit: jest.fn() }) }),
    } as any;

    const client = createMockSocket();

    await gateway.handleMessage(client, { threadId: 'thread-1', text: 'hello', tempId: 'tmp-1' });

    expect(client.emit).toHaveBeenCalledWith('chat:ack', expect.objectContaining({ tempId: 'tmp-1' }));
  });
});
