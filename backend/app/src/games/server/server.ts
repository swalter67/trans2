import { Socket } from "socket.io";
import * as CANNON from 'cannon-es'
import Physics from './Physics'
import { GameRoom, Player } from "../dto/games.dto";
import { Injectable } from "@nestjs/common";
import { UserInfo } from "src/dto/userRequest.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { WsException } from "@nestjs/websockets";
import { StatsService } from "src/stats/stats.service";
import { StatsInfo } from "src/stats/stats.dto";
import { GameGateway } from "../gateway/games.gateway";
import * as bezier from '../../../node_modules/bezier-easing/src/index';


@Injectable()
export class GameServer extends GameGateway{
	games: Record<string, GameRoom> = {}
	private easingValue: number

	constructor(private readonly prisma: PrismaService, 
							private readonly stats: StatsService) {
			super();
			this.setup()

		// Points de controles pour la courbe de Bezier
		//const easing = bezier(0.0, 0.6, 1.0, 0.4)
		const easing = bezier(0.7, 0, 0.3, 1)

		// valeur d'ajustement de la courbe de Bézier... necessaire ?? oh que oui
		this.easingValue = easing(1)
	}

	private setup() {
		setInterval(() => this.updateGames(), 1 / 60)
	}

	findGameRoomBySocket(socket: Socket): GameRoom | null
	{
		const roomId = Object.keys(this.games).find(room => this.games[room].players.includes(socket.id))
		if (roomId)
			return (this.games[roomId])
		else
			return (null)
    }

  findPlayerInRoom(socket: Socket, gameRoom: GameRoom): Player | null
	{
		if (gameRoom.players[0] === socket.id)
			return (gameRoom.playerLeft)
		else if (gameRoom.players[1] === socket.id)
			return (gameRoom.playerRight)
		else
			return (null)
  }

	private getRoomIdByRoom(room: GameRoom | null): string | null
	{
		const entries = Object.entries(this.games)

		for (const [roomId, existingRoom] of entries)
		{
			if (existingRoom === room)
				return roomId
		}
		return (null)
	}

	addLeftPlayer(socket: Socket, invite: boolean = false, infoUser: UserInfo)
	{
		// Creer une nouvelle Room
		let roomId: string = null;
		!invite ?
			roomId = `room-${Object.keys(this.games).length + 1}` :
			roomId = `private-${infoUser.roomId}`
		socket.join(roomId)
		//console.log(`Create new Room : ${roomId} for ${infoUser.username}.\n`)

		// Initialisation de la room
		this.games[roomId] = {
			players: [socket.id],
			ballOnFloor: false,
			ballPlayerX: 1,
			physics: null,
			playerLeft: {
				id: infoUser.id,
				name: infoUser.username,
				score: 0,
				pause: false,
				disconnect: false,
				win: false,
				distance: [],
				usePause: Number(process.env.MAX_PAUSE_GAME),
				exchanges: [],
				ready: false
			},
			playerRight: null,
			elements: null,
			roundTime: [],
			bounceWall: [],
			playerGetPoint: [],
			sound: 'none',
			endGame: false
		}
		socket.emit("messageDuServeur", 'Bonjour, Joueur de Gauche !')
		// this.io.server.in(roomId).emit('infoPlayer', this.games[roomId].playerLeft, null) 
	}

	addRightPlayer(socket: Socket, invite: boolean, infoUser: UserInfo, roomId: string)
	{
		if (this.games[roomId].playerLeft.id === infoUser.id)
			throw new WsException('You can\'t play with yourself');
		// Rejoindre la room disponible
		socket.join(roomId)
		//console.log(`Player ${infoUser.username} in ${roomId}.\n`)
		
		// Initialisation de la room pour le second joueur
		this.games[roomId].players.push(socket.id)
		this.games[roomId].playerRight = {
			id: infoUser.id,
			name: infoUser.username,
			score: 0,
			pause: false,
			disconnect: false,
			win: false,
			distance: [],
			usePause: Number(process.env.MAX_PAUSE_GAME),
			exchanges: [],
			ready: false
		}
		socket.emit("messageDuServeur", 'Bonjour, Joueur de Droite !')
	}

	disconnectPlayer(socket: Socket)
	{
		const gameRoom = this.findGameRoomBySocket(socket)
		if (!gameRoom) return

		const player = this.findPlayerInRoom(socket, gameRoom);
        if (!player) return

		const roomId = this.getRoomIdByRoom(gameRoom)
		if (!roomId) return

		//console.log(`Le joueur ${player.name} s'est deconnecte de la salle : ${roomId}`)
		if (gameRoom.physics)
			gameRoom.physics!.stop();
		player.pause = true
		player.disconnect = true
		// Marque le joueur comme déconnecté et timer de 15 sec
		// AJOUTER UN DECOMPTE DE 15SEC CHEZ L UTILISATEUR ENCORE CONNECTE
		//this.server.in(roomId).emit('screenEvent', `Deconnecte : ${player.name}`)
		let reco: number = 16;
		player.disconnectTimer = setInterval(() => {
			this.server.in(roomId).emit('endScreenEvent')
			if (reco == 0){
				this.terminateGame(gameRoom, roomId);
				clearInterval(player.disconnectTimer);
				return
			}
			this.server.in(roomId).emit('screenEvent', `Attente de ${player.name} - (${--reco})`, 'waiting');
		}, 1000);
	}

	reconnectPlayer(socket: Socket)
	{
    const gameRoom = this.findGameRoomBySocket(socket)
    if (!gameRoom) return;

    const player = this.findPlayerInRoom(socket, gameRoom)
    if (!player) return

		const roomId = this.getRoomIdByRoom(gameRoom)
		if (!roomId) return
		socket.join(roomId);
		//this.games[roomId].players.push(socket.id)
		this.server.in(roomId).emit("messageDuServeur", `Reconnection du joueur ${player.name}!`)

		//console.log(`Reconnect player : ${player.name} in ${roomId}.`);
    // Si le joueur est déconnecté, relance la partie
    if (player.disconnect) {
			//console.log(`Enlevement de la notif de deconnection`)
			this.server.in(roomId).emit('endScreenEvent')
			this.server.in(roomId).emit('screenEvent', 'Get ready!')
    	if (player.disconnectTimer)
        clearTimeout(player.disconnectTimer)
    }
	socket.emit('info', gameRoom.elements);
	player.disconnect = false
  }

	// ICI A VOIR QUAND UN JOUEUR CE DECO ET QUE LES 15SEC EXPIRE ===== Peut avoir des probleme au niveau de l enregistrement de data en db.
	private async terminateGame(gameRoom: GameRoom, roomId: string)
	{
		if (this.games[roomId].roundTime && this.games[roomId].roundTime.length > 0)
				this.games[roomId].roundTime[this.games[roomId].roundTime.length - 1] = Date.now() - this.games[roomId].roundTime[this.games[roomId].roundTime.length - 1];

		// Retire le gestionnaire d'evenement
		gameRoom.physics!.ballBody.removeEventListener("collide", (event: any) => this.updateVelocityEvent(event, roomId))
		if (gameRoom.playerLeft!.disconnectTimer)
			clearTimeout(gameRoom.playerLeft!.disconnectTimer)
		if (gameRoom.playerRight!.disconnectTimer)
			clearTimeout(gameRoom.playerRight!.disconnectTimer)

		// On regarde si un joueur s'est deceonnecte
		if (gameRoom.playerLeft!.disconnect === true)
			gameRoom.playerRight!.win = true
		else if (gameRoom.playerRight!.disconnect === true)
			gameRoom.playerLeft!.win = true

		this.server.to(gameRoom.playerLeft.win ? gameRoom.players[0] : gameRoom.players[1]).emit('screenEvent', `You win!`, 'win')
		this.server.to(!gameRoom.playerLeft.win ? gameRoom.players[0] : gameRoom.players[1]).emit('screenEvent', `You loose`, 'looser')
		//console.log(`${gameRoom.playerLeft!.name} Win`)

		delete this.games[roomId].physics;
		delete this.games[roomId].ballOnFloor;
		delete this.games[roomId].ballPlayerX;
		delete this.games[roomId].elements;

		//console.log(`La salle ${roomId} est supprimee : Fin de partie.`)
		// gameRoom.physics?.world.
		const score: StatsInfo = await this.writeDataGame(this.games[roomId]);
		//console.log(this.games[roomId]); 
		delete this.games[roomId]
		// Inscription des emelements en db uniquement si  moins un joueur est en ligne
		if (!gameRoom.playerLeft.disconnect || !gameRoom.playerRight.disconnect)
			this.stats.createStat(score);
	}

	private async  writeDataGame(room: GameRoom): Promise<any>
	{
		let resultat = [];
		for (let i = 0; i < room.playerLeft.exchanges.length; i++) {
			resultat.push(room.playerLeft.exchanges[i] + room.playerRight.exchanges[i]);
		}
		let score: any = {};
		room.playerLeft.score > room.playerRight.score ?
			(score.win = room.playerLeft.score) && (score.lose = room.playerRight.score) :
			(score.win = room.playerRight.score) && (score.lose = room.playerLeft.score);
		score.long_echange = Math.max(...resultat);
		score.rebond_max = Math.max(...room.bounceWall);
		score.ecart_max = Math.max(room.playerLeft.score, room.playerRight.score) - Math.min(room.playerLeft.score, room.playerRight.score);
		score.duree = room.roundTime.reduce((a, b) => a + b, 0);
		score.time = new Date();
		score.winnerId = room.playerLeft.win ? room.playerLeft.id : room.playerRight.id;
		score.looserId = room.playerLeft.win ? room.playerRight.id : room.playerLeft.id;

		let playerWin = room.playerLeft.win ? 'Left' : 'Right';
		let tmp = 0
		score.bonus_score = 0;
		room.playerGetPoint.forEach((value, index) => {
			if (value === playerWin) {
				score.bonus_score += 0.1;
				if (tmp < score.bonus_score)
					tmp += 0.1;
			}
			else
				score.bonus_score = 0;
		});
		score.bonus_score = tmp;

		return await this.prisma.games.create({
			data: {
				scoreWin: score.win,
				scoreLose: score.lose ? score.lose : 0,
				long_echange: score.long_echange,
				rebond_max: score.rebond_max,
				ecar_max: score.ecart_max,
				bonus_score: score.bonus_score,
				duree: score.duree,
				time: score.time,
				winnerId: score.winnerId,
				looserId: score.looserId,
			},
		select: {
			scoreWin: true,
			scoreLose: true,
			long_echange: true,
			rebond_max: true,
			ecar_max: true,
			bonus_score: true,
			duree: true,
			time: true,
			winnerId: true,
			looserId: true,
		}});	
	}

	launchGame(roomId: string)
	{
		// Envoi des infos de chaque joueur
		this.emitPlayersInfo(roomId)
			
		// Initialisation de la physics du jeu
		if (!this.games[roomId].physics) {
			this.games[roomId].physics = new Physics()
			this.games[roomId].elements = {
				newBall: true,
				ballPosition: null,
				ballVelocity: null,
				leftPaddlePosition: this.games[roomId].physics!.leftPaddleBody.position,
				rightPaddlePosition: this.games[roomId].physics!.rightPaddleBody.position,
			}
		}
	}

	keysEvents(roomId: string, paddle: CANNON.Body, input: string, player: Player, io: Socket)
	{
		if (input === 'keyW' && !this.games[roomId].playerLeft!.pause && !this.games[roomId].playerRight!.pause && player.distance[player.distance.length - 1]++)
			paddle.velocity.z = - this.games[roomId].physics!.worldParameters.paddleVelocity
		else if (input === 'keyS' && !this.games[roomId].playerLeft!.pause && !this.games[roomId].playerRight!.pause && player.distance[player.distance.length - 1]++) {
			paddle.velocity.z = this.games[roomId].physics!.worldParameters.paddleVelocity
		}
		else if (input === 'keyP') {
			if (this.games[roomId].physics!.isRunning && !this.games[roomId].playerLeft!.pause && !this.games[roomId].playerRight!.pause && player.usePause > 0) {
				this.games[roomId].physics!.stop()
				player.pause = true
				this.server.in(this.games[roomId].players).emit('screenEvent', `Pause : ${player.name}`, 'pause')
			}
			else if(player.pause) {
				player.usePause--
				this.games[roomId].physics!.start()
				player.pause = false
				this.server.in(this.games[roomId].players).emit('endScreenEvent', 'music')
			}
			this.emitPlayersInfo(roomId)
		}
	}
	
	private emitPlayersInfo(roomId: string)
	{
		// Envoi des infos de chaque joueur
		this.server.in(roomId).emit('infoPlayer', this.games[roomId].playerLeft, this.games[roomId].playerRight)
	}

	private updateGames()
	{
		Object.keys(this.games).forEach(roomId => {
			const room = this.games[roomId]
			
			if (room.elements && !room.playerLeft!.pause && !room.playerRight!.pause && !room.playerLeft!.disconnect && !room.playerRight!.disconnect) {
				this.updateBall(roomId)
				room.elements.ballPosition = room.physics!.ballBody.position
				room.elements.ballVelocity = room.physics!.ballBody.velocity
				room.elements.leftPaddlePosition = room.physics!.leftPaddleBody.position
				room.elements.rightPaddlePosition = room.physics!.rightPaddleBody.position
				this.server.in(roomId).emit('info', room.elements, room.sound);
				//room.elements.newBall = false;
				room.sound = 'none';
				this.checkPoint(roomId)
			}
		})
	}

	private updateBall(roomId: string)
	{
		const room = this.games[roomId]

		// Lancement de la balle
		if (!room.physics!.isRunning) {
			if(room.playerLeft!.score + room.playerRight!.score === 0)
				this.server.in(roomId).emit('launchGame')
			room.physics!.setBallBody()
			room.physics!.ballBody.position.z = (Math.random() - 0.5) * (room.physics!.worldParameters.floorDepth - 1)
			room.physics!.start()
			room.physics!.ballBody.addEventListener("collide", (event: any) => this.updateVelocityEvent(event, roomId))

			// Nouvelle manche : Ajout des tableaux
			if (room.roundTime && room.roundTime.length > 0)
				room.roundTime[room.roundTime.length - 1] = Date.now() - room.roundTime[room.roundTime.length - 1];
			//room.elements.newBall = true;
			room.roundTime.push(Date.now());
			room.playerRight.exchanges.push(0);
			room.playerLeft.exchanges.push(0);
			room.playerLeft.distance.push(0);
			room.playerRight.distance.push(0);
			room.bounceWall.push(0);
			room.playerGetPoint.push('');
		}
		// Joueur marque un point
		if (room.physics!.ballBody.position.y < - 2.5 && room.ballPlayerX === 0) {
			room.physics!.ballBody.position.x > 0 ? 
				(room.ballPlayerX = 1) && (room.playerLeft!.score += 1) && (room.playerGetPoint[room.playerGetPoint.length - 1] = 'Left'): 
				(room.ballPlayerX = -1) && (room.playerRight!.score += 1) && (room.playerGetPoint[room.playerGetPoint.length - 1] = 'Right')
			room.physics!.ballBody.removeEventListener("collide", (event: any) => this.updateVelocityEvent(event, roomId))
			room.physics!.world.removeBody(room.physics!.ballBody)
			this.emitPlayersInfo(roomId)
			room.physics!.stop()
			room.sound = 'loose'
			room.physics!.worldParameters.ballVelocity = room.physics!.worldParameters.initeBallVelocity
			room.ballOnFloor = false
		}
	}

	private updateVelocityEvent(event: any, roomId: string)
	{
		const room = this.games[roomId]
		if(!room || !room.physics)
			return

		if (room.physics!.worldParameters.ballVelocity < room.physics!.worldParameters.maxBallVelocity)
			room.physics!.worldParameters.ballVelocity += room.physics!.worldParameters.updateBallVelocity
		if(event.body === room.physics!.leftPaddleBody || event.body === room.physics!.rightPaddleBody)
		{

			// Modifier trajectoire en fonction du point de contact
			const pointOfImpact = event.contact.rj.z

			// Calcul du putain d'angle d'incidence
			const angleOfIncidence = Math.PI / 4 * pointOfImpact / 0.99

			// Calcule des nouvelles composantes x et z de la vélocité de la balle en fonction du putain d'angle d'incidence
			const originalVelocity = room.physics.worldParameters.ballVelocity
			const newVelocityX = Math.cos(angleOfIncidence) * originalVelocity
			const newVelocityZ = Math.sin(angleOfIncidence) * originalVelocity * this.easingValue

			// Ajuster la vitesse
			room.physics!.ballBody.velocity.set(newVelocityX, 0, newVelocityZ)

			if (room.physics!.ballBody.velocity.x < 0){
				room.playerLeft.exchanges[room.playerLeft.exchanges.length - 1]++;
				room.sound = 'leftBounce';
			}
			else {
				room.playerRight.exchanges[room.playerRight.exchanges.length - 1]++;
				room.sound = 'rightBounce';
			}
		}

		if(event.body === room.physics!.floorBody && !room.ballOnFloor) {
			room.physics!.ballBody.velocity.set(room.physics.worldParameters.ballVelocity * room.ballPlayerX , 0, (Math.random() - 0.5) * room.physics.worldParameters.ballVelocity)
			room.ballPlayerX = 0
			room.ballOnFloor = true
		}
		if(event.body === room.physics!.topWallBody || event.body === room.physics!.bottomWallBody) {
			room.bounceWall[room.bounceWall.length - 1]++;
			room.sound = 'wallBounce';
		}
	}
	
	private checkPoint(roomId: string)
	{
		const gameRoom = this.games[roomId]

		if(!gameRoom) return
		if (gameRoom.playerLeft!.score < Number(process.env.MAX_POINT_GAME) && gameRoom.playerRight!.score < Number(process.env.MAX_POINT_GAME))
			return
		gameRoom.playerLeft!.score > gameRoom.playerRight!.score ? gameRoom.playerLeft!.win = true : gameRoom.playerRight!.win = true;
		gameRoom.sound = 'win';
		this.terminateGame(gameRoom, roomId)
	}
} 
