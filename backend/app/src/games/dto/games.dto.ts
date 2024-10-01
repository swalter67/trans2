import * as CANNON from 'cannon-es'
import Physics from '../server/Physics'

export interface Player
{
	id: string
	name: string
	score: number
	pause: boolean
	usePause: number
	disconnect: boolean
	disconnectTimer?: NodeJS.Timeout
	win:boolean
	distance: number[],
	exchanges: number[],
	ready: boolean
}

export interface ElementPhysics
{
	newBall: boolean
	ballPosition: CANNON.Vec3 | null
	ballVelocity: CANNON.Vec3 | null
	leftPaddlePosition: CANNON.Vec3
	rightPaddlePosition: CANNON.Vec3
}

export interface GameRoom
{
	players: string[]
	ballOnFloor: boolean
	ballPlayerX: number
	physics: Physics | null
	playerLeft: Player | null
	playerRight: Player | null
	elements: ElementPhysics | null
	roundTime?: number[],
	bounceWall: number[],
	playerGetPoint: string[],
	sound: string,
	endGame: boolean
}
