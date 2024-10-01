import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/user/user.service';
import { ChatListeners } from './listeners/chat.listeners';
// import { ChatGateway } from './gateway/chat.gateway';

@Module({
  controllers: [ChatController],
  providers: [ChatService, UserService, PrismaService, ChatListeners]//, ChatGateway],
})
export class ChatModule {}
