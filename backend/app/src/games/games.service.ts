
import { ConsoleLogger, Injectable } from '@nestjs/common';
import { GameServer } from './server/server';
import { Socket } from 'socket.io';
import { WsClient } from 'src/notification/dto/notification.dto';
import { UserService } from 'src/user/user.service';
import { ConnectedSocket, MessageBody, SubscribeMessage, WsException } from '@nestjs/websockets';
import { GameGateway } from './gateway/games.gateway';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class GamesService extends GameGateway{

	constructor(private readonly gameServer: GameServer,
							private readonly userService: UserService,
							public event : EventEmitter2) {
		super();
	}

	async getOnline(): Promise<Array<string>> {
		const online: Array<string> = [];

		Object.keys(this.gameServer.games).forEach(room => {
			online.push(this.gameServer.games[room].playerLeft.id);
			if (this.gameServer.games[room].playerRight)
				online.push(this.gameServer.games[room].playerRight.id);
		})
		return online;
	}

	async newQuickGame(userId: string, client: Socket)
	{
		//console.log(`${userId} in quick game`);
		const userTab = await this.userService.getUserById(userId);

		let inRoom: Boolean = false;
		if (Object.keys(this.gameServer.games).length > 0)
		{
			Object.keys(this.gameServer.games).forEach(room =>
			{
				if (this.gameServer.games[room].players.includes(client.id))
					inRoom = true;
				else if (this.gameServer.games[room].playerLeft.id === userId &&
								this.gameServer.games[room].playerLeft.disconnect)
				{
					this.gameServer.games[room].players[0] = client.id;
					inRoom = true;
				}
				else if (this.gameServer.games[room].playerRight &&
								this.gameServer.games[room].playerRight.id === userId &&
								this.gameServer.games[room].playerRight.disconnect)
				{
					this.gameServer.games[room].players[1] = client.id;
					inRoom = true;
				}	
			});
		}

		if (inRoom)
			this.gameServer.reconnectPlayer(client);
		else
		{
			const availableRoom = Object.keys(this.gameServer.games).find(room => this.gameServer.games[room].players.length < 2 && !room.includes('private-'))
			if (!availableRoom)
				this.gameServer.addLeftPlayer(client, false, userTab)
			else
				this.gameServer.addRightPlayer(client, false, userTab, availableRoom)
		}
	}
 
	async quitGame(userId: string, client: Socket) {
		// ERREUR!! doit recuperer le vrai userId (userId est == au body de la requete), avec le socket on peut recuperer le userId dans la room. player[0] ou player[1]/ gauche ou droite.
		const userTab =  await this.userService.getUserById(userId);
		//console.log(`${userTab.username} as left the game`);
		this.gameServer.disconnectPlayer(client)
	}

	async playerInput(input:any, client: Socket) {
		const roomId = Object.keys(this.gameServer.games).find(room => this.gameServer.games[room].players.includes(client.id))
			if(roomId && this.gameServer.games[roomId].physics && this.gameServer.games[roomId].physics.leftPaddleBody) {
				if (this.gameServer.games[roomId].players[0] === client.id)
					this.gameServer.keysEvents(roomId, this.gameServer.games[roomId].physics!.leftPaddleBody, input, this.gameServer.games[roomId].playerLeft!, client)
				else
					this.gameServer.keysEvents(roomId, this.gameServer.games[roomId].physics!.rightPaddleBody, input, this.gameServer.games[roomId].playerRight!, client)
			}
	}	

	async playerReady(client: Socket)
	{
		const roomId = Object.keys(this.gameServer.games).find(room => this.gameServer.games[room].players.includes(client.id))
		if(roomId) {
			if (this.gameServer.games[roomId].players[0] === client.id) 
				this.gameServer.games[roomId].playerLeft.ready = true
			else if(this.gameServer.games[roomId].players[1] &&
							this.gameServer.games[roomId].players[1] === client.id)
				this.gameServer.games[roomId].playerRight.ready = true
			// si les deux joueurs sont ready on lance le jeu sinon faire un message waiting for player
			if (this.gameServer.games[roomId].playerLeft.ready &&
					this.gameServer.games[roomId].playerRight &&
					this.gameServer.games[roomId].playerRight.ready){
				let decount: number = 4;
				if (this.gameServer.games[roomId].roundTime[0]) { //&& (!this.gameServer.games[roomId].playerLeft.ready || !this.gameServer.games[roomId].playerRight.pause)) {
					this.server.to(client.id).emit('launchGame');
					this.gameServer.games[roomId].elements.newBall = true
					this.server.to(client.id).emit('info', this.gameServer.games[roomId].elements, this.gameServer.games[roomId].sound);
				}

				const interval = setInterval(() => {
					if (this.gameServer.games[roomId].playerLeft.disconnect || this.gameServer.games[roomId].playerRight.disconnect)
						clearInterval(interval);
					this.server.to(this.gameServer.games[roomId].players).emit('endScreenEvent')
					this.server.to(this.gameServer.games[roomId].players).emit('screenEvent', (--decount).toString(), decount == 3 ? 'music' : null)
					if (decount <= 0){
						if (!this.gameServer.games[roomId].roundTime[0] && !this.gameServer.games[roomId].ballOnFloor){
							this.server.to(this.gameServer.games[roomId].players).emit('endScreenEvent');
							this.gameServer.launchGame(roomId); 
							
						}
						else {
							// Les deux joueurs peuvent etre deco en meme temps... il faut retrouver le bon joueur qui se reco....
							// concernant le joueur a reco voir dans le server au niveau reconnect et join le player[x] a la bonne position en fonction de son id
							this.gameServer.findPlayerInRoom(client, this.gameServer.findGameRoomBySocket(client)).disconnect = false;
							this.gameServer.findPlayerInRoom(client, this.gameServer.findGameRoomBySocket(client)).pause = false;
							this.server.to(client.id).emit('infoPlayer', this.gameServer.games[roomId].playerLeft, this.gameServer.games[roomId].playerRight) 
							delete this.gameServer.findPlayerInRoom(client, this.gameServer.findGameRoomBySocket(client)).disconnectTimer;
							if (this.gameServer.games[roomId].playerLeft.pause){
								this.server.to(this.gameServer.games[roomId].players).emit('endScreenEvent')
								setTimeout(() => {
								this.server.to(this.gameServer.games[roomId].players).emit('screenEvent', `Pause ${this.gameServer.games[roomId].playerLeft.name}`, 'pause')}, 500)
							}
							else if (this.gameServer.games[roomId].playerRight.pause) {
								this.server.to(this.gameServer.games[roomId].players).emit('endScreenEvent')
								setTimeout(() => {
								this.server.to(this.gameServer.games[roomId].players).emit('screenEvent', `Pause ${this.gameServer.games[roomId].playerRight.name}`, 'pause')}, 500)
							}
							else {
								this.gameServer.games[roomId].physics.start();
								this.server.to(this.gameServer.games[roomId].players).emit('endScreenEvent');
							}
						}
						clearInterval(interval)
					}
				}, 1000)
			}
		}
	}

	async createInvite(userId: string, data: WsClient ,client: Socket) {

		let inRoom: Boolean = false;
		if (Object.keys(this.gameServer.games).length > 0)
		{
			Object.keys(this.gameServer.games).forEach(room =>
			{
				if (this.gameServer.games[room].players.includes(client.id))
					inRoom = true;
				else if (this.gameServer.games[room].playerLeft.id === userId &&
								this.gameServer.games[room].playerLeft.disconnect)
				{
					this.gameServer.games[room].players[0] = client.id;
					inRoom = true;
				}
				else if (this.gameServer.games[room].playerRight &&
								this.gameServer.games[room].playerRight.id === userId &&
								this.gameServer.games[room].playerRight.disconnect)
				{
					this.gameServer.games[room].players[1] = client.id;
					inRoom = true;
				}	
			});
		}

		if (inRoom)
			return this.gameServer.reconnectPlayer(client);


		const userTab = await this.userService.getUserById(userId);
		userTab.roomId = `${userTab.id}-${(Math.random()*1000000).toFixed(0)}`
		this.gameServer.addLeftPlayer(client, true, userTab);
		const infoSend: WsClient = {
			idRequest: 0,
			username: userTab.username,
			sendFrom: userTab.id,
			sendTo: data.sendTo,
			for: `private-${userTab.roomId}`,
			avatar: userTab.avatar_url,
			type: 'inviteGame',
			content: `${userTab.username} invite you to play a game!`,
			answer: null,
			date: new Date()
		}
		this.event.emit('notification.inviteGame', infoSend);
	}

	private async joinInvite(userId: string, data: WsClient, client: Socket) {
		const userTab = await this.userService.getUserById(userId);
		if (!this.gameServer.games[data.for]) {
			client.emit('leaveGame', 'Your invite is no longer available');
			return;
		}
			this.gameServer.addRightPlayer(client, true, userTab, String(data.for))
	}

	async refuseInvite(userId: string, data:WsClient) {
		const userTab = await this.userService.getUserById(userId);
		data.content = `${userTab.username} refuse to play a game!`;
		data.answer = 'decline';
		this.event.emit('notification.declineGame', data);
	}

	///////////////////////////////////////////////////////////////////////////////////////////////
	////////////////////////////// SOCKET IO DISCONNECT ///////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////

	async handleDisconnect(
		@ConnectedSocket() client: Socket) { 
		let kill: Boolean = false;

		Object.keys(this.gameServer.games).forEach(room => {
			if (this.gameServer.games[room].players.includes(client.id) && !this.gameServer.games[room].playerRight) {
				kill = true;
				delete this.gameServer.games[room]
				//console.log("Room deleted: " + room);
			}
		});
		if (!kill)
			this.gameServer.disconnectPlayer(client);
		this.server.socketsLeave(client.id);
		//console.log(this.gameServer.games)
		//console.log("Disconnect game");
	}

	///////////////////////////////////////////////////////////////////////////////////////////////
	////////////////////////// SOCKET IO MESSAGE HANDLER //////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////

	@SubscribeMessage('quickGame')
	async handleNotification(
				@MessageBody() data: WsClient,
				@ConnectedSocket() client: Socket) {
		const decoded = await this.userIdSocket(client.handshake.headers.cookie);
		if (!decoded || decoded === undefined || decoded === null)
			throw new WsException('Invalid token');
		return await this.newQuickGame(decoded.id, client);
	}

 	@SubscribeMessage('createInvite')
	async handleCreateInvite(
				@MessageBody() data: any,
				@ConnectedSocket() client: Socket) {
		const decoded = await this.userIdSocket(client.handshake.headers.cookie);
		//console.log(decoded);
		if (!decoded || decoded === undefined || decoded === null)
			throw new WsException('Invalid token');
		this.createInvite(decoded.id, data, client);
		}

	@SubscribeMessage('joinGame')
	async handleAskGame(
		@MessageBody() data: WsClient,
		@ConnectedSocket() client: Socket) {
			const decoded = await this.userIdSocket(client.handshake.headers.cookie);
			if (!decoded || decoded === undefined || decoded === null)
				throw new WsException('Invalid token'); // Les execptions en websocket raccroche la socket du client!!! A voir si on peut faire autrement.
			data && data.answer === 'join' ?
				this.joinInvite(decoded.id, data, client) :
				this.refuseInvite(decoded.id, data)
		}

		// Not implemented yet
	@SubscribeMessage('quitGame')
	async handleLeaveChat(
				@MessageBody() data: any,
				@ConnectedSocket() client: Socket) {
		this.quitGame(data, client);
	}

	@SubscribeMessage('playerInput')
	async handlePlayerInput(
				@MessageBody() data: any,
				@ConnectedSocket() client: Socket) {	
		this.playerInput(data, client);
	}

	@SubscribeMessage('ready')
	async handlePlayerReady(
				@ConnectedSocket() client: Socket) {
		this.playerReady(client);
	}

}
