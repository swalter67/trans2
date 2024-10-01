import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Members, MembresStatus, MenmbresRole, Rooms } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UserService } from 'src/user/user.service';
import { WsClient } from 'src/notification/dto/notification.dto';
import { ChatGateway } from './gateway/chat.gateway';
import { UserInfo } from 'src/dto/userRequest.dto';
import { rmSync } from 'fs';

@Injectable()
export class ChatService extends ChatGateway{
  constructor( private prisma: PrismaService,
								private readonly user: UserService) {
					super();
				}

	async checkStartEnd(start: number, end: number): Promise<number[]> {
		if (start < 0 || end < 0 || isNaN(start) || isNaN(end))
			throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
		if (start > end && end !== 0) {
			const tmp = start;
			start = end;
			end = tmp;
		}
		if (start > 0)
			start--;
		return [start, end];
	}

	//** roomAll *//
	async getAllRoom(
					password: string = 'all',
					start: number = 0,
					end: number = 0,
					): Promise<Rooms[]>{
		[start, end] = await this.checkStartEnd(start, end);
		const query: any = {};
		password === 'false' ?
			query.where = { password : null, privacy : 'PUBLIC' } :
		password === 'true' ?
			query.where = { password : { not: null }, privacy : 'PUBLIC' } :
			query.where = { privacy : 'PUBLIC'};
		query.skip = start;
		if (end > 0)
			query.take = end - start;
					
    const ret: any = await this.prisma.rooms.findMany(query);
		ret.forEach((room: any) => {
			room.password !== null ? room.password = true : room.password = false;
		});
		return ret;
	}

	//** roomMe *//
	async getRoomMe(
				userId: string,
				has: string = 'all',
				privacy: string = 'all',
				password: string = 'all',
				start: number,
				end: number): Promise<Rooms[]> {
		await this.checkMute();
		[start, end] = await this.checkStartEnd(start, end);

		const query: any = {
			where: {
				member: {
					some: {
						userId: userId } } },
			include: {
				member: {
					select: {
						id: true,
						role: true,
						status: true
					},
					where: {
						userId: userId } }
			}};
		switch (true) {
			case (has === 'owner'):
				query.where.member.some.role = 'OWNER';
				break;
			case (has === 'admin'):
				query.where.member.some.role = 'ADMIN';
				break;
			case (has === 'member'):
				query.where.member.some.role = 'MEMBER';
				break;
		}
		switch (true) {
			case (password === 'false'):
				query.where.password = null;
				break;
			case (password === 'true'):
				query.where.password = { not: null };
				break;
		}
		switch (true) {
			case (privacy === 'public'):
				query.where.privacy = 'PUBLIC';
				break;
			case (privacy === 'private'):
				query.where.privacy = 'PRIVATE';
				break;
		}
		query.skip = start;
		if (end > 0)
			query.take = end - start;
		return await this.prisma.rooms.findMany(query)
	}

	async checkMute() {
		const user = await this.prisma.members.findMany({
			where: {
				status: 'MUTE',
			}
		})
		.catch((res) => {
			throw new HttpException('Request error', HttpStatus.BAD_REQUEST);
		});
		user.forEach(async (member: any) => {
			if (member.time <= new Date())
				await this.prisma.members.update({
					where: { id: member.id },
					data: { status: 'ALLOW' }}
					);
			});
	}

	//** roomSearch **//
	async getRoomSearch(id: number): Promise<Rooms> {
		if (isNaN(id) || id < 0)
			throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
		const rep: any = await this.prisma.rooms.findUnique({
			where: {
				id: id
			},
			include: {
				member: {}
			}
			});
			if (rep !=null && rep.member !== undefined && rep.member !== null){
				rep.member = rep.member.length;
				if (rep.password !== null)
					rep.password = true;
				else
					rep.password = false;
			}
			return rep;
	}

	//** roomSearchByName **//
	async getRoomSearchByName(name: string): Promise<Rooms[]> {
		if (name === undefined || name === null || name === '' || name.length < 3)
			throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
		const rep: any = await this.prisma.rooms.findMany({
			where: {
				name : {
					contains: name}
			},
			include: {
				member: {
				}
			}
		});
		if (rep !=null){
			rep.forEach((room: any) => {
				room.member = room.member.length;
				if (room.password !== null)
					room.password = true;
				else
					room.password = false;
			});
		}
		return rep;
	}

	//** deleteRoom **//
	async deleteRoom(userId: string, roomId: number): Promise<Rooms> {
		if (isNaN(roomId) || roomId <= 0)
			throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
		const room: any = await this.prisma.rooms.findUnique({
			where: {
				id: roomId
			},
			include: {
				member: {
					where: {
						AND: [
						{userId: userId},
						{role: 'OWNER'}]
			}}}});
		if (room === null)
			throw new HttpException(`Room don't exist!`, HttpStatus.NOT_FOUND);
		if (room.member.length === 0)
			throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
		await this.prisma.messages.deleteMany({
				where: { roomId: roomId }
			});
		await this.prisma.members.deleteMany({
			where: { roomId: roomId }
		});
		return await this.prisma.rooms.delete({
			where: { id: roomId }
		});
	}
 
	//** deleteRoomMember **//
	async deleteRoomMember(userId: string, roomId: number, memberId: number, reason: string | undefined): Promise<Members> {
		if (isNaN(roomId) || roomId <= 0 || isNaN(memberId) || memberId <= 0)
			throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
		const accepted = await this.getMemberRole(userId, roomId)
			.then((res) => {
				if (!res || (res.role === 'MEMBER' && res.userId !== userId) || (res.role === 'ADMIN' && res.userId !== userId))
					throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
				return res;
		});
		let target: string;
		const who = await this.prisma.members.findUnique({
			select: {userId: true,},
			where: {
				id: memberId
			}
			})
			.then((res) => {
				if (res === null)
					throw new HttpException(`Member don't exist!`, HttpStatus.NOT_FOUND);
				target = res.userId;
				return [res.userId, this.getMemberRole(res.userId, roomId)
					.then((res) => {
						if (res.role === 'OWNER' || accepted.role === 'ADMIN' && res.role === 'ADMIN')
							throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
						return res;})];
			});
		await this.getRoomSearch(roomId)
			.then((res) => {
				if (res.privacy === 'PRIVATE' && who[0] !== userId)
					throw new HttpException('Forbidden, you can delete on yourself!', HttpStatus.FORBIDDEN);
			})
		
		if (reason != undefined && reason != null && reason != '' && reason.length > 0) {
			if(userId){
				const userAsk = await this.user.getUserById(userId);
				const room = await this.getRoomSearch(roomId);
				const data: WsClient = {
					idRequest: 1,
					username: 'KICK',
					sendFrom: userId,
					sendTo: target,
					for: room.name,
					avatar: userAsk.avatar_url,
					type: 'newRoomStatus',
					content: reason,
					answer: null,
					date: new Date(),
				}
				this.user.event.emit('notification.chatRoomStatus', data);
			}
		}
		return await this.prisma.members.delete({
			where: { id: memberId }
		});

	}

	//** getMemberRole **//
	async getMemberRole(userId: string, roomId: number): Promise<Members> {
		if (isNaN(roomId) || roomId <= 0)
			throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
		await this.user.getUserById(userId)
			.then((res) => {
				if (res === null)
					throw new HttpException('User not found!', HttpStatus.NOT_FOUND);
		});
		await this.getRoomSearch(roomId)
			.then((res) => {
				if (res === null)
					throw new HttpException('Room not found!', HttpStatus.NOT_FOUND);
			});
		const room: any = await this.prisma.rooms.findUnique({
			where: {
				id: roomId
			},
			include: {
				member: {
					select: {
						role: true,
						userId: true
					},
					where: {
						userId: userId,
		}}}});
		return room.member[0];
	}

	//** createRoom **//
	async createRoom(userId: string, body: any): Promise<Rooms> {
		if (body.name === undefined || body.name === null
				|| body.name === '' || body.name.length < 3 || body.name.length > 64 || body.name === "undefined")
				
				throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
		if( ((body.password !== undefined && body.password !== null && body.password !== '')
					&& body.password.length < process.env.MIN_PASSWORD_LENGTH) && body.password.length > 64)
			throw new HttpException('Password too short!', HttpStatus.BAD_REQUEST);
		await this.prisma.rooms.findFirst({
			where: {
				name: body.name,
			}})
			.then((res) => {
				if (res !== null)
					throw new HttpException(`Room already exist!`, HttpStatus.NOT_FOUND);
			});
		const room: any = await this.prisma.rooms.create({
			data: {
				name: body.name,
				password: body.password ? await this.hashpwd(body.password) : null,
				description: body.description ? body.description : null,
				avatar: body.avatar ? body.avatar : null,
// verifier que si privacy existe, elle devrait etre en PRIVATE donc mettre privacy en PRIVATE + verifier qu il n y ai pas de password.
				privacy: body?.privacy === 'PRIVATE' ? 'PRIVATE' :'PUBLIC',
				member: {
					create: {
						userId: userId,
						role: 'OWNER',
						status: 'ALLOW'
					}
				}
			},
			select: {
				id: true,
				name: true,
				description: true,
				avatar: true
		}});
		room.password !== null ? room.password = true : room.password = false;
		return room;
	}

	//** addMember **//
	async addMember(userId: string,
				roomId: number,
				newUserId: string,
				type: string = 'MEMBER',
				body: any,
				status: MembresStatus = 'ALLOW'): Promise<Members> {
		let has: MenmbresRole = 'MEMBER';
		if (isNaN(roomId) || roomId <= 0)
			throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
		if (newUserId === undefined || newUserId === null || newUserId === '')
			newUserId = userId;
		await this.getMemberRole(newUserId, roomId)
			.then((res) => {
				if (res)
					throw new HttpException('User is already a member!', HttpStatus.NOT_MODIFIED);
			});
		if (userId !== newUserId) {
			has = await this.getMemberRole(userId, roomId)
				.then((res) => {
					if (!res)
						throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
					if (res && res.role === 'OWNER' || res.role === 'ADMIN'){
						switch (true) {
							case (type.toLowerCase() === 'owner'):
								return 'ADMIN';
							case (type.toLowerCase() === 'admin'):
								return 'ADMIN';
						}
					}
					return 'MEMBER';
				});
			status = 'ASK';
		}
		else {
			await this.controlRoomPwd(roomId, body)
			.then((res) => {
				if (!res)
					throw new HttpException('Incorrect password!', HttpStatus.UNAUTHORIZED);
		});
	}
		const ret = await this.prisma.members.create({
			data: {
				roomId: roomId,
				userId: newUserId,
				role: has,
				status: status
			}
		});
		// Notification
		if (status === 'ASK'){
			const userAsk = await this.user.getUserById(userId);
			const room = await this.getRoomSearch(roomId);
			const data: WsClient = {
				idRequest: ret.id,
				username: userAsk.username,
				sendFrom: userId,
				sendTo: newUserId,
				for: null,
				avatar: userAsk.avatar_url,
				type: 'newInviteRoom',
				content: `${userAsk.first_name} ${userAsk.last_name} invite you to join room ${room.name}`,
				answer: null,
				date: new Date(),
			};
			this.user.event.emit('notification.chatInviteRoom', data);
		}
		return ret;
	}

	//** controlRoomPwd **//
  private async controlRoomPwd(
								roomId: number,
    						body: any): Promise<boolean> {
		const room = await this.getRoomSearch(roomId);
		if (Boolean(room.password) == false)
			return true;
		if (body.password === undefined || body.password === null || body.password === '')
			return false;
		return await bcrypt.compareSync(body.password, await this.prisma.rooms.findUnique({
			where: {
				id: roomId
			},
			select: {
				password: true
		}}).then((res) => { return res.password; }));
  }

	//** setUser **//
	async setUser(userId: string,
				roomId: number,
				target: string,
				status: string,
				role: string,
				time: number): Promise<Members> {
		if (isNaN(roomId) || roomId <= 0 || userId === target)
			throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
		const targetRole= await this.getMemberRole(target, roomId)
			.then((res) => {
				if (!res)
					throw new HttpException('User is not a member!', HttpStatus.NOT_FOUND);
				return res.role;
			});
		const targetMembreId = await this.prisma.members.findFirst({
			where: { roomId: roomId, userId: target },
			select: { id: true }});
		const userRole = await this.getMemberRole(userId, roomId)
			.then((res) => {
				if (!res || res.role === 'MEMBER')
					throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
				return res.role;
			});
		const query: any = {
			where: { id: targetMembreId.id },
			data: {}
		};
		if (status
				&& await this.prisma.members.findFirst({
					where: { roomId: roomId, userId: target },
					select: { status: true }})
						.then ((res) => {
							return res.status !== 'ASK' ? true : false;
					})
					&& status.toLowerCase() !== 'ask') {
			switch (true) {
				case (status.toLowerCase() === 'allow'):
					query.data.status = 'ALLOW';
					break;
				case (status.toLowerCase() === 'mute'):
					query.data.status = 'MUTE';
					const setTime = new Date();
					setTime.setMinutes(setTime.getMinutes() + time);
					query.data.time = setTime;
					break;
				case (status.toLowerCase() === 'ban'):
						query.data.status = 'BAN';
						break;
				case (status.toLowerCase() === 'ask'):
						query.data.status = 'ASK';
						break;
			}
		}
		if (role && userRole === 'ADMIN' && (targetRole === 'OWNER' || role.toLowerCase() === 'owner' || role.toLowerCase() === 'admin'))
			throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
		if (role) {
			switch (true) {
				case (role.toLowerCase() === 'owner'):
					query.data.role = 'OWNER';
					break;
				case (role.toLowerCase() === 'admin'):
					query.data.role = 'ADMIN';
					break;
				case (role.toLowerCase() === 'member'):
					query.data.role = 'MEMBER';
					break;
			}
		}
		const ret = await this.prisma.members.update(query);

		// Notification
		if (query.data.role || query.data.status){
			const userAsk = await this.user.getUserById(userId);
			const room = await this.getRoomSearch(roomId);
			const data: WsClient = {
				idRequest: ret.id,
				username: query.data.status,
				sendFrom: userId,
				sendTo: target,
				for: room.name,
				avatar: userAsk.avatar_url,
				type: 'newRoomStatus',
				content: `Your status in room ${room.name} was changed as ${ret.role} to ${query.data.status} by ${userAsk.first_name} ${userAsk.last_name}`,
				answer: null,
				date: new Date(),
			};
			this.user.event.emit('notification.chatRoomStatus', data);
		}
		
		return ret;
	}
	

	//** getMemberStatus **//
	async getMemberStatus(userId: string, roomId: number): Promise<Members> {
		if (isNaN(roomId) || roomId <= 0)
			throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
		await this.user.getUserById(userId)
			.then((res) => {
				if (res === null)
					throw new HttpException('User not found!', HttpStatus.NOT_FOUND);
		});
		await this.getRoomSearch(roomId)
			.then((res) => {
				if (res === null)
					throw new HttpException('Room not found!', HttpStatus.NOT_FOUND);
			});
		const room: any = await this.prisma.rooms.findUnique({
			where: {
				id: roomId
			},
			include: {
				member: {
					select: {
            status: true,
						role: true
					},
					where: {
						userId: userId,
		}}}});
		return room.member[0];
	}

	//** addMessage **//
	async addMessage(userId: string, roomId: number, body: any): Promise<any> {
 		if (isNaN(roomId) || roomId <= 0)
			throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
		await this.getMemberStatus(userId, roomId)
			.then((res) => {
				if (!res)
					throw new HttpException('User is not a member!', HttpStatus.NOT_FOUND);
				if (res.status === 'ASK')
					throw new HttpException(`User need accept invite before send message!`, HttpStatus.FORBIDDEN);
			});
		await this.getMemberStatus(userId, roomId)
			.then((res) => {
				if (res.status === 'BAN' || res.status === 'MUTE')
					throw new HttpException(`User ${res.status}!`, HttpStatus.FORBIDDEN);
			});		
		if (!body || !body.message || body.message === '')
			throw new HttpException('No message!', HttpStatus.BAD_REQUEST);
		const memberNumber = await this.prisma.members.findFirst({
			where: {
				roomId: roomId,
				userId: userId
			},
		})
		const ret = await this.prisma.messages.create({
			data: {
				message: body.message,
				read: false,
				roomId: roomId,
				date: new Date(),
				membre: memberNumber.id
			}
		});
		const info: any = await this.prisma.members.findFirst({
			where: {
				roomId: roomId,
				NOT: {
					userId: userId
				}
			},
			include: {
				roomIdF: {
					select: {
						privacy: true
					}
				}
			}
		});
		
		
		
		
		
		
		
		// Notification
		const userAsk = await this.user.getUserById(userId);
		const room = await this.getRoomSearch(roomId);
		
		const data: WsClient = {
			idRequest: ret.id,
			username: userAsk.username,
			sendFrom: userId,
			for: roomId,
			avatar: userAsk.avatar_url,
			type: 'newPublicMessage',
			content: null,
			sendTo: null,
			answer: null,
			date: new Date(),
		};

 		if (info && info.roomIdF.privacy === 'PRIVATE') {
			data.sendTo = info.userId
			data.type = 'newPrivateMessage',
			data.content = `${body.message.toString().substring(0, 57)}` + (body.message.toString().length > 57 ? '...' : ''),
			this.user.event.emit('notification.chatNewMessage', data);
			this.user.event.emit('chat.newMessage', data);
		}
		else {
			data.content = body.message,
			this.user.event.emit('chat.newMessage', data);
		}
		return ret;
	}

	
	
	
	async findMembersByRoomId(roomId: number): Promise<Members[]> {
		return this.prisma.members.findMany({
		  where: { 
			roomId: Number(roomId),
		 },
		  include: {
			userIdF: {
			  select: {
				username: true,
				
			  },
			},
		  },
		});
	  }
	
	
	
	
	
	
	
	//** getMessage **//
	// si room privee, passer les messages en concernant l utilisateur qui le concerne lu a true
	async getMessage(userId: string, roomId: number, start: number, end: number, read: boolean): Promise<any> {
		if (isNaN(roomId) || roomId <= 0)
			throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
		[start, end] = await this.checkStartEnd(start, end);
		await this.getMemberStatus(userId, roomId)
			.then((res) => {
				if (!res)
					throw new HttpException('User is not a member!', HttpStatus.NOT_FOUND);
				if (res.status === 'ASK')
					throw new HttpException(`User need accept invite before send message!`, HttpStatus.FORBIDDEN);
				if (res.status === 'BAN')
					throw new HttpException(`User ${res.status}!`, HttpStatus.FORBIDDEN);
			});
		const query: any = {
			where: {
				roomId: roomId,
			},
			include: {
				membreF: {
					include: {
						userIdF: {
							select: {
								username: true,
								avatar_url: true
							}
						}
					}
				},
			},
			orderBy: {
				date: 'desc'
			}
		}
		query.skip = start;
		if (end > 0)
			query.take = end - start;
		//return await this.prisma.messages.findMany(query);

		let allmsg = await this.prisma.messages.findMany(query);

		const getPrivateStatusOfRoom = await this.prisma.rooms.findFirst({
			where: { id: roomId
			},
			select: {
				privacy: true,
			}
		});
		if(getPrivateStatusOfRoom.privacy === 'PRIVATE')
		{
			await this.prisma.messages.updateMany({
				where: {
				  id: {
					in: allmsg.map((message) => message.id),
				},
				NOT: {
					membreF: {
					userId: userId,
				},
				}
				},
				data: {
				  read: true,
				},
			  });
		}

		return allmsg;
		
	}

	async emitNewMessage(data: WsClient): Promise<void> {
		this.server.to(`room${data.for}`).emit('newRoomMessage', data);
	}

	async getPrivateRoom(userId: string): Promise<any> {
		const retUsers = await this.prisma.rooms.findMany({
			where: {
				privacy: 'PRIVATE',
				member: {
					some: {
						userId: userId
					}
				}
			},
			include: {
				member: {
					where: {
						NOT: {
							userId: userId
						}
					},
					include: {
						userIdF: {
							select: {
								username: true,
								first_name: true,
								last_name: true,
								avatar_url: true
							}
						}
					} 
				},
		}});
		return retUsers;
	}

	//** getPrivateRoom **//
	async readMessage(userId: string, idMessage: Number) : Promise<boolean> {


		return false;
	}













/* 
// liste des room public ou user est membre
async listRoomPublicMemb(userID: string): Promise<Rooms[]> {
    const roomPubliMb = await this.prisma.rooms.findMany({
        where: {
            privacy: 'PUBLIC',
            member: {
                some: {
                    userId: userID,
                    }   
                }
            }
        })
        return roomPubliMb;
}

// liste des room pivate ou user est membre

async listRoomPrivateMemb(userId: string): Promise<Rooms[]> {
    const roomPrivMb = await this.prisma.rooms.findMany({
        where: {
            privacy: 'PRIVATE',
            member: {
                some: {
                    userId: userId,
                }
            }
        }
    })
    return roomPrivMb;
} */

// liste des room private ou 2 user sont membres pour le create private room

async listPrivateRoomsWithUsers(usr1: string, usr2: string): Promise<Rooms[]> {
    const _roomsPrivate = await this.prisma.rooms.findMany({
      where: {
        privacy: 'PRIVATE', 
        member: {
          some: {
            userId: usr1,
          },
        },
        AND: {
          member: {
            some: {
              userId: usr2,
            },
          },
        },
      },
    });
  
    return _roomsPrivate;
  }


   // crate private room

  async createPM(usr1: string, usr2: string, name: string){
	const alreadyExist = await this.listPrivateRoomsWithUsers(usr1, usr2);
    if(!(await this.listPrivateRoomsWithUsers(usr1, usr2)))
      {
        return alreadyExist;
      }
    if(!(await this.user.getUserById(usr2)))
    {
      throw new Error('pas de usr2 ou blocked');
    }
    
    const newPrivateRoom = await this.prisma.rooms.create({
      data: {
        name: name,
        password: null,
        avatar: null,
		description: null,
        privacy: 'PRIVATE',
        
        },
      
      include: {
        member: {
          include: {
            userIdF: true,
          },
        },
      },
    });
  
    

    const idroom = newPrivateRoom.id;

    this.addUserToRoom(usr1, idroom, MenmbresRole.ADMIN);
    this.addUserToRoom(usr2, idroom, MenmbresRole.ADMIN);
    return newPrivateRoom;

  } 
  
  async addUserToRoom(userid: string, roomId: number, role: MenmbresRole = MenmbresRole.MEMBER, password?: string) : Promise<Members> {

    //check si room existe
    const _room = await this.getidroom(roomId)
    if(!_room) {
      throw new Error('room doesnt exist');
    }
//    if(_room.privacy === 'PUBLIC' && _room.password &&  // a verifier
//      await this.controlRoomPwd(password, _room.pwd ))
//    {
 //    throw new Error('error pwd room');
  //  }
    //check si ueser deja dans room member
    const usr_inroom = await this.prisma.members.findFirst({
      where: {
        userId: userid,
        roomId: roomId,
      },
    })     
    if (usr_inroom) {
      throw new Error('user deja dans room');
 
    }  
    
    const _roommuser = await this.prisma.members.create({
      data: {
        role: role,
        roomId: roomId,
        userId: userid
      }
    })
    return _roommuser;
  }

  async getidroom(roomId: number, Imembers = false ): Promise<any>{
    const _room = await this.prisma.rooms.findUnique({
      where: {
        id: roomId
      },
      include: {
        member: {
          include: {
            userIdF: Imembers,
          }
        }
      }
    })
    return _room
  }

  private async hashpwd(pwd: string): Promise<string> {
    const conter = 12;
    const _pwd = await bcrypt.hash(pwd, conter);
    return _pwd;
  }

  async getMemberStatusInRoom( memberId: string, roomId: number, mode: number): Promise<string | null> {
    
    if (mode == 1) {
      const member = await this.prisma.members.findFirst({
          where: {
            roomId: roomId,
            userId: memberId,
          },
          select: {
            status: true,
          },
        });
        return member ? member.status : null;
   }
   else {
      const member = await this.prisma.members.findFirst({
          where: {
            roomId: roomId,
            userId: memberId,
          },
          select: {
            role: true,
          },
        });
        return member ? member.role : null;
   }
	}

	async setRoomStatus(id: string, roomId: number, body: any) {	
		if ((await this.getMemberRole(id, roomId)).role != 'OWNER')
			throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
		
		if (body.name && (body.name === undefined || body.name === null
			|| body.name === '' || body.name.length < 3 || body.name.length > 64 || body.name === "undefined"))
				throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
	
		if( ((body.password !== undefined && body.password !== null && body.password !== '')
				&& body.password.length < process.env.MIN_PASSWORD_LENGTH) && body.password.length > 64)
		throw new HttpException('Password too short!', HttpStatus.BAD_REQUEST);

		if (body.name) {
			await this.prisma.rooms.findFirst({
			where: {
				name: body.name,
			}})
			.then((res) => {
				if (res !== null && res.id !== roomId)
					throw new HttpException(`Room name already exist!`, HttpStatus.BAD_REQUEST);
			});
	}

	const query: any = {
			where: { id: roomId },
			data: {
				name: body.name ? body.name : undefined,
				password: body.noPassword === "true" ? null : body.password ? await this.hashpwd(body.password) : undefined,
				description: body.description ? body.description : undefined,
				avatar: body.avatar ? body.avatar : undefined
			}
		};

		return await this.prisma.rooms.update(query);
	}
}




