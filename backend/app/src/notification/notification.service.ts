import { Injectable } from '@nestjs/common';
import { WsClient } from './dto/notification.dto';
import { NotificationGateway } from './gateway/notification.gateway';
import { PrismaService } from 'src/prisma/prisma.service';
import { Messages } from '@prisma/client';

@Injectable()
export class NotificationService extends NotificationGateway{  constructor( private prisma: PrismaService) {
super();}



	// Get all notifs
	async getAll(userId: string) {
		const rooms = await this.prisma.rooms.findMany({
			where: {
			  privacy: 'PRIVATE',
			  member: {
				some: {
				  userId,
				},
			  },
			},
			select: {
			  id: true, 
			  name: true,
			},
		  });

		  const roomIds = rooms.map((room) => room.id);
		 	//console.log(roomIds);
		  
      const unreadMessages = await this.prisma.messages.findMany({
        where: {
          read: false,
          roomId: {
            in: roomIds,
          },
          membreF: {
            NOT: {
              userId: userId
            },
          }
        },
        select: {
          roomId: true,
          roomIdF: {
            select: {
              name: true,
            },
          },
          membreF: {
            select: {
              userId: true,
            },
          },	 
        },	
      });



      const askFriend = await this.prisma.friends.findMany({
        where: {
          friendAsked: userId,
          accepted: false
        },
        select: {
          id: true,
          friendAskerF: {
            select: {
              username: true,
            },
          }
        }

      });

      type Parsed = {
          idRequest: number,
          username: string,
          answer: boolean
      }

      let parsing: Parsed;
      let parsed_request = [];

      for (let i = 0; i < askFriend.length; i++) {
        parsing = {
          idRequest: askFriend[i].id,
          username: askFriend[i].friendAskerF.username,
          answer: false
        }
        parsed_request.push(parsing);
      }
		 
		  return [ parsed_request , unreadMessages];
	}
		
		
		
		// recup toutes les notifs de l'utilisateur, friend en ask, message prive non lu destine a l'utilisateur.
		
	
	
	// Type de notification:
	async emitNewFriend(payload: WsClient) {
		if (await this.isOnline(payload.sendTo))
			this.server.to(`notif_${payload.sendTo}`).emit('newFriend', payload);
	}

	async handleFriendAccepted(payload: WsClient) {
		const list = await this.server.in(`User_${payload.sendTo}`).fetchSockets();
		if (await this.isOnline(payload.sendTo))
			this.server.to('notif_' + payload.sendTo).emit('reponseNewFriend', payload);
	}

	async chatInviteRoom(payload: WsClient) {
		if (await this.isOnline(payload.sendTo))
			this.server.to(`notif_${payload.sendTo}`).emit('chatInviteRoom', payload);
	}

	async chatRoomStatus(payload: WsClient) {
		if (await this.isOnline(payload.sendTo))
			this.server.to(`notif_${payload.sendTo}`).emit('chatRoomStatus', payload)
				//console.log("User is online and the notif is send");	
	}
	async chatNewMessage(payload: WsClient) {
		if (await this.isOnline(payload.sendTo))
			this.server.to(`notif_${payload.sendTo}`).emit('chatNewMessage', payload);
	}

	async gameInviteGame(payload: WsClient) {
		if (await this.isOnline(payload.sendTo))
			this.server.to(`notif_${payload.sendTo}`).emit('inviteGame', payload);
	}

	async gameDeclineGame(payload: WsClient) {
		if (await this.isOnline(payload.sendTo))
			this.server.to(`notif_${payload.sendTo}`).emit('gameDeclineGame', payload);
	}

	private async isOnline(id: string): Promise<boolean> {
		const list = await this.server.in(`notif_${id}`).fetchSockets();
		if (list[0])
			return true;
		return false;
	}
	async gameRefuseInvite(payload: WsClient) {
		if (this.isOnline(payload.sendTo))
			this.server.to(`notif_${payload.sendTo}`).emit('refuseInvite', payload);
	}

}

