import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer, WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { WsClient } from 'src/notification/dto/notification.dto';

@WebSocketGateway({
	namespace: 'chat',
	cors: {
		origin: [`${process.env.HOST_FRONT}`,
		`http://${process.env.HOST_FRONT}:${process.env.PORT_FRONT}`,
		`ws://${process.env.HOST_FRONT}:${process.env.PORT_FRONT}`,
		`http://127.0.0.1:${process.env.PORT_FRONT}`,
		`ws://127.0.0.1:${process.env.PORT_FRONT}`,
		`ws://localhost:${process.env.PORT_FRONT}`,
		`http://localhost:${process.env.PORT_FRONT}`],
		cookie: true,
    methods: ['GET', 'POST'],
	  credentials: true,
  },
})

export class ChatGateway {

	@WebSocketServer()
		server: Server;

	async handleConnection(
		@ConnectedSocket() client: Socket) {
		 const decoded = await this.userIdSocket(client.handshake.headers.cookie);
		 if (!decoded || decoded === undefined || decoded === null)
		 		return //throw new WsException('Invalid token');
		client.join(`chat_${decoded.id}`);
		//console.log('Client chat connected: ' + decoded.id);
	}	

	async handleDisconnect(
		@MessageBody() client: Socket) {
			this.server.socketsLeave(client.id);
			//console.log('Client chat disconnected: ' + client.id);
	}

	async userIdSocket(cookie: string): Promise<any> {
		let cookieParsed;
		if (!cookie || cookie === undefined || cookie === null)
			return;
		cookie.replaceAll(' ', '').split(';').forEach(element => {
			if (element.search('jwt') == 0)
				cookieParsed = element.split('=');
		});
		if (!cookieParsed || cookieParsed === undefined || cookieParsed === null)
			return;
		const jwt = new JwtService;
			let decoded = await jwt.decode(
			cookieParsed[1])
		//console.log(decoded);	
		return decoded;
	}

	@SubscribeMessage('joinRoom')
	async handleJoinRoom(
				@MessageBody() data: WsClient,
				@ConnectedSocket() client: Socket) {
		const rooms = this.server.adapter;
		const inRoom = await this.userInRoom(rooms, client.id);		
		if (inRoom !== null) {
			this.server.to(inRoom).emit('byeBoy', `${data.username} left the chat`);
			client.leave(inRoom);
		}
		client.join(`room${data.for}`);
		this.server.to(`room${data.for}`).emit('newBoy', `${data.username} join the chat`);
	}

	async userInRoom(rooms: any, id: string): Promise<string> {
		let inRoom = null;
		rooms.rooms.forEach((room, roomkey) => {
			if (roomkey.search('room') == 0){
				room.forEach((userId, key) => {
					if (userId === id)
								inRoom = roomkey;
				});
			}
		});
		return inRoom;
	}

}