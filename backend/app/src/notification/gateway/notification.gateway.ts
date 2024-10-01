import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer, WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
	namespace: 'notifications',
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

export class NotificationGateway {

	@WebSocketServer()
		server: Server;

	async handleConnection(
		@ConnectedSocket() client: Socket) {
		const decoded = await this.userIdSocket(client.handshake.headers.cookie);
		if (!decoded || decoded === undefined || decoded === null)
			return //throw new WsException('Invalid token');
		client.join(`notif_${decoded.id}`);
		//console.log("Connection notif " + decoded.id);
	}	

	async handleDisconnect(
		@MessageBody() client: Socket) {
			this.server.socketsLeave(client.id);
			//console.log("Disconnect notif");
	}

	async userIdSocket(cookie: string): Promise<any> {
		let cookieParsed;
		if (!cookie || cookie === undefined || cookie === null)
			return
		cookie.replaceAll(' ', '').split(';').forEach(element => {
			if (element.search('jwt') == 0)
				cookieParsed = element.split('=');
		});
		if (!cookieParsed || cookieParsed === undefined || cookieParsed === null)
			return;
		const jwt = new JwtService;
			let decoded = await jwt.decode(
			cookieParsed[1])
		return decoded;
	}
}