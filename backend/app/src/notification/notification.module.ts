import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationListeners } from './listeners/notification.listeners';
import { NotificationController } from './notification.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  providers: [NotificationService, NotificationListeners, PrismaService],
  controllers: [NotificationController]
})
export class NotificationModule {}
