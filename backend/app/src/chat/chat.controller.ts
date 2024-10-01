import { Controller, Get, Put, Patch, Delete, Req, Query, Param, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';
import { UserRequest } from 'src/dto/userRequest.dto';
import { time } from 'console';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

	//retourne la liste des room avec ou sans l'utilisateur present (en option)
	@Get('room/all')
		async roomAll(
			@Req() req: UserRequest,
			@Query('password') password: string = 'all',
			@Query('start') start: string = '',
			@Query('end') end: string = '')
			
			{
			return this.chatService.getAllRoom(password, Number(start), Number(end));
		}

	@Get('room/me')
	async roomMe(@Req() req: UserRequest,
				@Query('has') has: string = 'all',
				@Query('privacy') privacy: string = 'all',
				@Query('password') password: string = 'all',
				@Query('start') start: string = '',
				@Query('end') end: string = ''){
		return this.chatService.getRoomMe(req.user.id, has, privacy, password, Number(start), Number(end));
	}

	@Get('room/search/:id')
	async roomSearch(@Req() req: UserRequest, @Param('id') id: string){
		return this.chatService.getRoomSearch(Number(id));
	}

	@Get('room/search/name/:name')
	async roomSearchByName(@Req() req: UserRequest, @Param('name') name: string){
		return this.chatService.getRoomSearchByName(name);
	}

	@Delete('room/:id')
	async roomDelete(@Req() req: UserRequest, @Param('id') id: string){
		return this.chatService.deleteRoom(req.user.id, Number(id));
	}

	// Reste a ajouter le fait qu on ne peut pas supprimer le owner.
	@Delete('room/:id/member/:idMember')
	async roomDeleteMember(
				@Req() req: UserRequest,
				@Param('id') id: string,
				@Param('idMember') idMember: string,
				@Query('reason') reason: string = undefined){
		return this.chatService.deleteRoomMember(req.user.id, Number(id), Number(idMember), reason);
	}

//cree room public avec ou sans mot de passe 
	@Post('room/create')
	async createRoon(@Req() req: UserRequest,
				@Body() body: any){
		return this.chatService.createRoom(req.user.id, body);
	}

	@Post('room/member/:id/add')
	async addRoom(@Req() req: UserRequest,
				@Param('id') id: string,
				@Query('user') newUserId: string,
				@Query('role') role: string = 'MEMBER',
				@Body() body: any){
		return this.chatService.addMember(req.user.id, Number(id), newUserId, role, body);
	}

	@Patch('room/:id/user/:idUser')
	async roomSetfUser(@Req() req: UserRequest,
				@Param('id') roomId: string,
				@Param('idUser') target: string,
				@Query('status') status: string,
				@Query('role') role: string,
				@Query('time') time: string = '0') {
		return this.chatService.setUser(req.user.id, Number(roomId), target,status, role, Number(time));
	}

	@Post('room/:id/message/add')
	async roomAddMessage(@Req() req: UserRequest,
				@Param('id') roomId: string,
				@Body() body: any){
		return this.chatService.addMessage(req.user.id, Number(roomId), body);
	}

	@Get('room/:id/message')
	async roomGetMessage(@Req() req: UserRequest,
				@Param('id') roomId: string,
				@Query('start') start: string = '',
				@Query('end') end: string = '',
				@Query('read') read: string = 'all') {
		return this.chatService.getMessage(req.user.id, Number(roomId), Number(start), Number(end), Boolean(read));
	}
	
	//recupere les messages prives ?friend=true|false&read=true|false&count=true|false
	@Get('room/private')
		async roomPrivate(@Req() req: UserRequest ){
			return await this.chatService.getPrivateRoom(req.user.id);			
		}


	@Put('/room/private/new/:id')
	async roomPrivateCreate(@Req() req: UserRequest,
				@Param('id') usr2: string,
				@Query('name') name: string){
		return await this.chatService.createPM(req.user.id, usr2, name);
	}	

	@Get('/status/room/:roomId/user/:userId')
	async msir(@Req() req: UserRequest,
		@Param('roomId') roomId: string,
		@Param('userId') userId: string,
		@Query('mode') mode: string,
	){
		return this.chatService.getMemberStatus(userId, Number(roomId));
	}

	@Patch('/room/:roomId/status')
	async roomStatus(@Req() req: UserRequest, @Param('roomId') roomId: string,  @Body() body: any){
		return this.chatService.setRoomStatus(req.user.id, Number(roomId), body);
	}


	@Get('/room/:id/members')
	async rooMembers(@Req() req: UserRequest, @Param('id') id: number){
		return this.chatService.findMembersByRoomId(id);
	}

		
	//retourne les information de la room ainsi que le status de l'utilisateur
	@Get('room/:id')
		async roomInfo(){}

	//ajoute l'user a la room, mot de passe dans le body si present { "password":"123456
	@Put('/room/member/:id/add')
		async roomPutUser(){}

	//ajoute les utilisateur donnée en admin a la room sélectionné
	@Patch('/room/:id/add')
		async roomUserAdmin(){}

	//ajout le message et l'associe a l'id de la room
	@Put('/room/:id/message/add')
		async roomMessage(){}

	//retourne les x derniers messages de la room demandé [?start=number&stop=number&read=true|false] 
	@Get('/room/:id/message')
		async RoomMessageReturn(){}

	// 38 modifie les option/status de l'utilisateur donné
	@Patch('/room/:idRoom/user/:idUser/')
		async roomModifInfo(){}

	//enlever l'user de la room
	@Delete('/room/:id/member')
		async roomMmbDelete(){}

	//cree une nouvelle room private + ajout des deux utilisateur en tant que membre
	








	// Passer le message recu en lu si celui ci est destine a l'utilisateuren question
	@Patch('/read/message/:id')
		async readMessage(
			@Req() req: UserRequest,
			@Param('id') idMessage: string){
			return this.chatService.readMessage(req.user.id, Number(idMessage));
		}
	

}
