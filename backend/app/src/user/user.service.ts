import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WsClient } from 'src/notification/dto/notification.dto';
import { UserInfo } from 'src/dto/userRequest.dto';
import { NotificationGateway } from 'src/notification/gateway/notification.gateway';

@Injectable()
export class UserService extends NotificationGateway{
  constructor(private readonly prisma: PrismaService,
							public event : EventEmitter2,){
							//public notificationGateway: NotificationGateway){
		super();
	}

	//** getFriends **//
	async getFriends(id: string, acceped: string = 'true'): Promise<any[]> {
		const query: any = {
			where: { id },
      include: {
        friendAsk: {
          select: {
            friendAskedF: {
              select: {
                id: true,
                username: true,
                first_name: true,
                last_name: true,
                avatar_url: true,
                email: true}}}},
        friendAsked: {
          select: {
            friendAskerF: {
              select: {
                id: true,
                username: true,
                first_name: true,
                last_name: true,
                avatar_url: true,
                email: true }
							}
						}
					}
				}
			};

		if (acceped !== 'all' && acceped !== 'false') {
			query.include.friendAsk.where = { accepted: true };
			query.include.friendAsked.where = { accepted: true };
		}
		else if (acceped === 'false'){
			query.include.friendAsk.where = { accepted: false };
			query.include.friendAsked.where = { accepted: false };
		}
		const user: any = await this.prisma.users.findUniqueOrThrow(query);

    return [...user.friendAsk.map((friend) => friend.friendAskedF),
						...user.friendAsked.map((friend) => friend.friendAskerF)];
  }

	//** isFriend **//
  async isFriend(userId: string, friendId: string, alreadyFriend: string = 'true') {
  	return await this.getFriends(userId, alreadyFriend)
	 	.then((friends) => {
			return friends.find((friend) => friend.id === friendId)
		});
  }

	//** getUserById **//
	async getUserById(id: string): Promise<any> {
    return await this.prisma.users.findUniqueOrThrow({ 
			select: { id: true,
						username: true,
						first_name: true,
						last_name: true,
						avatar_url: true,
						email: true,
						level: true,
						blokedBy: true,
					},
			where: { id } })
			.catch((err) => {
				throw new HttpException('User not found', HttpStatus.NOT_FOUND)});
  }

	//** addFriend **//
  async addFriend(userId: string, friendId: string){
		const user = await this.getUserById(userId);
		await this.getUserById(friendId)
			.catch((err) => { throw new HttpException('Friend not found', HttpStatus.NOT_FOUND)});
    if(await this.isFriend(userId, friendId, 'all') !== undefined)
   		throw new HttpException('A friend request was already sended.', HttpStatus.ACCEPTED);
		const newFriends = await this.prisma.friends.create({
    data: {
      friendAsker: userId,
      friendAsked: friendId,
      accepted: false }
  	});

		// Notification
	  const data: WsClient = {
	  	idRequest: newFriends.id,
	  	username: user.username,
	  	sendFrom: newFriends.friendAsker,
	  	sendTo: newFriends.friendAsked,
	  	for: null,
	  	avatar: user.avatar_url,
	  	type: 'newFriend',
	  	content: `${user.first_name} ${user.last_name} want add you as friend`,
	  	answer: null,
	  	date: newFriends.date,
	  };
	  this.event.emit('notification.newFriend', data);
    return newFriends;
  }

	//** answerFriend **//
  async answerFriend(FriendId: number, accepted: boolean){
    let ask;
		accepted ?
			ask = await this.prisma.friends.update({
      	where: { id: FriendId },
      	data: {accepted: accepted, date: new Date()},
      	}) :
			ask = await this.prisma.friends.delete({
				where: { id: FriendId } });
		const user = await this.getUserById(ask.friendAsked);

		// Notification
		const data: WsClient = {
	  	idRequest: ask.id,
	  	username: user.username,
	  	sendFrom: ask.friendAsked,
	  	sendTo: ask.friendAsker,
	  	for: null,
	  	avatar: user.avatar_url,
	  	type: 'OK',
	  	content: `${user.first_name} ${user.last_name} ${accepted?'acceped':'decline'} your friend request`,
	  	answer: null,
	  	date: ask.date,
	  };
		this.event.emit('notification.friendAccepted', data);
		return ask;
  }

	//** deleteFriend **//
	async deleteFriend(id: string, friendId: string) {
		if (await this.isFriend(id, friendId, 'true' ) === undefined &&
				await this.isFriend(id, friendId, 'false') === undefined)
			throw new HttpException('User not found', HttpStatus.NOT_FOUND);
		return await this.prisma.friends.deleteMany({
			where: {
				OR: [
					{ friendAsker: id, friendAsked: friendId },
					{ friendAsker: friendId, friendAsked: id }
				]
			}})
			.catch((err) => { throw new HttpException(err.message, HttpStatus.NOT_FOUND); });
	}
	
	//** getBlockedUser **//
	async getBlockedUser(id: string) {
    return await this.prisma.users.findUnique({
      where: { id },
      include: { blokedBy: {
                    select: { id: true }},
                  bloked: {
                    select: { id: true }}}})
    .then((bu) => {
      return [...bu.blokedBy, ...bu.bloked];});
  }


	//** getUsers **//
  async getUsers(id: string, start: number = 0, end: number = 0) {
		if (start < 0 || end < 0 || isNaN(start) || isNaN(end))
			throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
		if (start > end && end !== 0) {
			const tmp = start;
			start = end;
			end = tmp;
		}
		if (start > 0)
			start--;
    const exclus = (await this.getBlockedUser(id)).map((ex) => ex.id);
    exclus.push(id);
		const query: any = {
      select: {
				id: true,
        username: true,
        first_name: true,
        last_name: true,
        avatar_url: true,
        intra_login: true},
      where: {
				id: { notIn: exclus}
		}};
		if (start > 0)
			query.skip = start;
		if (end > 0)
			query.take = end - start;

    return await this.prisma.users.findMany(query)
      .catch((err) => { throw new HttpException(err.message, HttpStatus.NOT_FOUND); });
		
  }

	//** getUsr **//
  async getUsr(userId: string){
    return await this.prisma.users.findUniqueOrThrow({ 
			select: {
				id: true,
				username: true,
				first_name: true,
				last_name: true,
				avatar_url: true,
				intra_login: true,
				email: true,
				fa_key: true,
				created: true,
				last_co: true,
				level: true,
				play_time: true,
				medal: true,
			},
			where: { id: userId }});
  }

	//** blockUser **//
  async blockUser(userId: string, bUserId: string){
    if(userId === bUserId)
      throw new HttpException('can not block yourself', HttpStatus.NOT_FOUND);
    const fri = await this.isFriend(userId, bUserId)
      .then((fri) => {
        this.prisma.friends.deleteMany({
          where: {
          OR: [
            { friendAsker: userId, friendAsked: bUserId },
            { friendAsker: bUserId, friendAsked: userId }
            ]
          }})
        });
    const usr = await this.getUserById(userId);
    const buser = await this.getUserById(bUserId);
    if(usr && buser)
    {
      return await this.prisma.users.update({
        where: { id: userId },
        data: {
          bloked: {
            connect: {
              id: bUserId}}}});
    }
    throw new Error('User not founded');
  }

	//** unblockUser **//
  async unblockUser(userId: string, bUserId: string) {
    if(userId === bUserId)
      throw new HttpException('can not unblock yourself', HttpStatus.NOT_FOUND);
    const usr = await this.getUserById(userId);
    const buser = await this.getUserById(bUserId);
    if(usr && buser) {
      return await this.prisma.users.update({
        where: { id: userId },
          data: {
            bloked: {
              disconnect: {
                id: bUserId}}}});
      }
    throw new Error('User not founded');
  }

	//** getBlockedByMe **//
	async getBlockedByMe(id: string) {
		return await this.prisma.users.findUnique({
			where: { id },
				include: { bloked: {
					select: {
						id: true,
						username: true,
						first_name: true,
						last_name: true,
						avatar_url: true
					}
				}
			}
		})
		.then((res) => {
			return res.bloked;
		});
	}

	//** updateUser **//
	async updateUser(id: string, body: UserInfo) {
		let username = body.username;
		while (!await this.isUsernameExist(username, id))
			username = body.username + (Math.random()*10000).toFixed(0);
		body.username = username;
		return await this.prisma.users.update({
			select: {
				id: true,
				username: true,
				first_name: true,
				last_name: true,
				avatar_url: true,
				email: true,
				fa_key: true,
				created: true,
			},
			where: { id },
			data: {
				username: body.username,
				//first_name: body.first_name,
				//last_name: body.last_name,
				avatar_url: body.avatar_url
			}
		});
	}

	//** isUsernameExist **//
	async isUsernameExist(newName: string, id: string): Promise<boolean> {
		const ifExist = await this.prisma.users.findUnique({
			where: { username: newName }
		})
		if (ifExist?.username === newName && ifExist?.id !== id)
			return false;
		return true;
	}

	//** searchUserByName **//
	async searchUserByName(id: string, username: string) {
		if (username.length < 3)
			return [];
		const exclus = (await this.getBlockedUser(id)).map((ex) => ex.id);
		exclus.push(id);
		return await this.prisma.users.findMany({
			select: {
				id: true,
				username: true,
				first_name: true,
				last_name: true,
				avatar_url: true,
				intra_login: true
			},
			where: {
				username: {
					contains: username
				},
				id: { notIn: exclus}
			}
		});
	}

	//** getConnectedUsers **//
	// async getConnectedUsers() {
	// 	const listUsers = [];
	// 	const rooms: any = this.server.adapter
	// 	rooms.rooms.forEach((room, roomkey) => {
	// 		if (roomkey.search('notif_') == 0){
	// 			listUsers.push(roomkey.replace('notif_', ''));
	// 		}
	// 	});
	// 	return listUsers;




	// }




	async getConnectedUsers() {
		const listUsers = [];
		const rooms: any = this.server.adapter
		rooms.rooms.forEach(async (room, roomkey) => {
			if (roomkey.search('notif_') == 0){
				listUsers.push(roomkey.replace('notif_', ''));
			}
		});
		const return_value = [];
		for(let i = 0; i < listUsers.length; i++) {
			let current_user = await this.getUserById(listUsers[i]);
			return_value.push(current_user);
		}
		return return_value;


		
		

	}

}