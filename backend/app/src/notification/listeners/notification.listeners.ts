import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WsClient } from '../dto/notification.dto';
import { NotificationService } from '../notification.service';

@Injectable()
export class NotificationListeners {
	constructor(private readonly server : NotificationService) {}

  @OnEvent('notification.newFriend')
	emitNewFriend(payload: WsClient) {
		this.server.emitNewFriend(payload);
		//console.log("Demande d'ami:", payload);
	}

	@OnEvent('notification.friendAccepted') // renvoi la reponse a l'emetteur
	handleFriendAccepted(payload: WsClient) {
		this.server.handleFriendAccepted(payload);
		//console.log("Acceptation/Refus de la demande:", payload);
	}

	@OnEvent('notification.chatInviteRoom') // demande d'invite a une room, quand on invite un user a une room, si la valeur STATUS n'est pas renseigner elle est a ASK donc l user doit d abord accepter avant de pouvoir rejoindre la room...
	handleChatInviteRoom(payload: WsClient) {
		this.server.chatInviteRoom(payload);
		//console.log("Demande invite room:", payload);
	}

	@OnEvent('notification.chatRoomStatus') // Notif en cas de changement de status d un user dans une room
	handleChatRoomStatus(payload: WsClient) {
		this.server.chatRoomStatus(payload);
		//console.log("Status/role in room changed:", payload);
	}
	
	@OnEvent('notification.chatNewMessage') // information d un nouveau message privee... a mettre en action uniquement si la room n'est pas ouverte
	handleChatNewMessage(payload: WsClient) {
		this.server.chatNewMessage(payload);
		//console.log("New private message:", payload);
	}

	@OnEvent('notification.inviteGame') // demande d'invite a un partie... la reponse se fait par l ouverture du namespace pong, en envoi de message joinGame avec le payload et la reponse join ou decline
	handleInviteGame(payload: WsClient) {
		this.server.gameInviteGame(payload);
		//console.log("Invite to a game:", payload);
	}

	@OnEvent('motification.declineGame') // reponse a une demande d'invite a une partie
	handleRefuseInvite(payload: WsClient) {
		this.server.gameRefuseInvite(payload);
		//console.log("Refuse invite to a game:", payload);
	}
}
