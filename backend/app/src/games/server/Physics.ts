import * as CANNON from 'cannon-es'
import { time } from 'console'

export default class Physics
{
	world: CANNON.World

	private defaultMaterial!: CANNON.Material
	private wallMaterial!: CANNON.Material
	private paddleMaterial!: CANNON.Material
	private ballMaterial!: CANNON.Material

	private defaultBallContactMaterial!: CANNON.ContactMaterial
	private wallPaddleContactMaterial!: CANNON.ContactMaterial
	private floorPaddleContactMaterial!: CANNON.ContactMaterial
	private ballWallContactMaterial!: CANNON.ContactMaterial
	private ballPaddleContactMaterial!: CANNON.ContactMaterial

	private floorShape!: CANNON.Box
	private wallShape!: CANNON.Box
	private paddleShape!: CANNON.Box
	private ballShape!: CANNON.Sphere

	floorBody!: CANNON.Body
	topWallBody!: CANNON.Body
	bottomWallBody!: CANNON.Body
	leftPaddleBody!: CANNON.Body
	rightPaddleBody!: CANNON.Body
	ballBody!: CANNON.Body


	private intervalId: NodeJS.Timeout | null = null
	isRunning: boolean = false

	worldParameters: {
		paddleVelocity: number
		ballVelocity: number
		initeBallVelocity: number
		updateBallVelocity: number
		maxBallVelocity: number
		floorWith: number
		floorDepth: number
		wallHeight: number
		paddleWidth: number
		paddleHeight: number
		paddleDepth: number
	} = {paddleVelocity: 6.3,
		ballVelocity: 6,
		initeBallVelocity: 6,
		updateBallVelocity: 0.5,
		maxBallVelocity: 15,
		floorWith: 18,
		floorDepth: 9,
		wallHeight: 5,
		paddleWidth: 0.25,
		paddleHeight: 0.5,
		paddleDepth: 1.5
	}

	constructor()
	{
		// Set World
		this.world = new CANNON.World()
		this.world.broadphase = new CANNON.SAPBroadphase(this.world)
		this.world.broadphase.dirty = true
		this.world.gravity.set(0, - 9.82, 0)

		
		// Setup
		this.setMaterial()
		this.setDefaultBallContactMaterial()
		this.setWallPaddleContactMaterial()
		this.setPaddleFloorContactMaterial()
		this.setBallWallContactMaterial()
		this.setBallPaddleContactMaterial()
		this.setFloorShape()
		this.setWallShape()
		this.setPaddleShape()
		this.setBallShape()
		this.setFloorBody()
		this.setWallBody()
		this.setPaddleBody('left')
		this.setPaddleBody('right')
		// this.setBallBody()
		// this.update()
	}

	private setMaterial()
	{
		this.defaultMaterial = new CANNON.Material('default')
		this.wallMaterial = new CANNON.Material('wallMaterial')
		this.ballMaterial = new CANNON.Material('ballMaterial')
		this.paddleMaterial = new CANNON.Material('paddleMaterial')
	}

	private setDefaultBallContactMaterial()
	{
		this.defaultBallContactMaterial = new CANNON.ContactMaterial(
			this.ballMaterial,
			this.defaultMaterial,
			{
				friction: 0,
				restitution: 0
			})
		this.world.defaultContactMaterial = this.defaultBallContactMaterial
	}

	private setBallWallContactMaterial()
	{
		this.ballWallContactMaterial = new CANNON.ContactMaterial(
			this.ballMaterial,
			this.wallMaterial,
			{
				friction: 0,
				restitution: 1.01
			}
		)
		this.world.addContactMaterial(this.ballWallContactMaterial)
	}
	
	private setBallPaddleContactMaterial()
	{
		this.ballPaddleContactMaterial = new CANNON.ContactMaterial(
			this.ballMaterial,
			this.paddleMaterial,
			{
				friction: 0,
				restitution: 1
			}
		)
		this.world.addContactMaterial(this.ballPaddleContactMaterial)
	}

	private setPaddleFloorContactMaterial()
	{
		this.floorPaddleContactMaterial = new CANNON.ContactMaterial(
			this.paddleMaterial,
			this.defaultMaterial,
			{
				friction: 0.01,
				restitution: 0
			}
		)
		this.world.addContactMaterial(this.floorPaddleContactMaterial)
	}

	private setWallPaddleContactMaterial()
	{
		this.wallPaddleContactMaterial = new CANNON.ContactMaterial(
			this.wallMaterial,
			this.paddleMaterial,
			{
				friction: 0,
				restitution: 0
			}
		)
		this.world.addContactMaterial(this.wallPaddleContactMaterial)
	}
		
	private setFloorShape()
	{
		this.floorShape = new CANNON.Box(new CANNON.Vec3(
			this.worldParameters.floorWith * 0.5,
			0.5 * 0.5,
			this.worldParameters.floorDepth * 0.5
		))
	}
		
	private setWallShape()
	{
		this.wallShape = new CANNON.Box(new CANNON.Vec3(
			(this.worldParameters.floorWith + 0.2) * 0.5,
			this.worldParameters.wallHeight * 0.5,
			0.5 * 0.5
		))
	}

	private setBallShape()
	{
		this.ballShape = new CANNON.Sphere(0.25)
	}
	
	private setPaddleShape()
	{
		this.paddleShape = new CANNON.Box(new CANNON.Vec3(
			this.worldParameters.paddleWidth * 0.5,
			this.worldParameters.paddleHeight * 0.5,
			this.worldParameters.paddleDepth * 0.5
		))
	}

	private setFloorBody()
	{
		this.floorBody = new CANNON.Body(
		{
			mass: 0,
			shape: this.floorShape,
			material: this.defaultMaterial,
			position: new CANNON.Vec3(0, -0.25, 0)
		})
		this.world.addBody(this.floorBody)
	}

	private setWallBody()
	{
		this.topWallBody = new CANNON.Body({
			mass: 0,
			shape: this.wallShape,
			material: this.wallMaterial,
			type: CANNON.Body.STATIC,
			position: new CANNON.Vec3(0, 0.5, - (this.worldParameters.floorDepth / 2))
		})
		this.bottomWallBody = new CANNON.Body({
			mass: 0,
			shape: this.wallShape,
			material: this.wallMaterial,
			type: CANNON.Body.STATIC,
			position: new CANNON.Vec3(0, 0.5, (this.worldParameters.floorDepth / 2))
		})
		this.world.addBody(this.topWallBody)
		this.world.addBody(this.bottomWallBody)
	}

	setBallBody()
	{
		this.ballBody = new CANNON.Body({
			mass: 1,
	  		position: new CANNON.Vec3(0, 9, 0),
			material: this.ballMaterial,
			shape: this.ballShape
   		})
		this.world.addBody(this.ballBody)
	}

	private setPaddleBody(paddleName: string)
	{
		const paddle = new CANNON.Body({
			mass: 100,
			shape: this.paddleShape,
			material: this.paddleMaterial
		})
		paddle.linearFactor.set(0, 0, 1)
		paddle.angularDamping = 1
		if (paddleName === 'left')
		{
			paddle.position = new CANNON.Vec3(- (this.worldParameters.floorWith / 2) + (this.worldParameters.paddleWidth / 2) + 0.2,
												this.worldParameters.paddleHeight / 2,
												0)
			this.leftPaddleBody = paddle
		}
		else if (paddleName === 'right')
		{
			paddle.position = new CANNON.Vec3((this.worldParameters.floorWith / 2) - (this.worldParameters.paddleWidth / 2) - 0.2,
												this.worldParameters.paddleHeight / 2,
												0)
			this.rightPaddleBody = paddle
		}
		this.world.addBody(paddle)
	}

	start()
	{
		if (!this.isRunning)
		{
			this.isRunning = true
			this.intervalId = setInterval(() => this.updatePhysics(), 1000 / 60)
		}
	}

	stop()
	{
		if (this.isRunning && this.intervalId !== null)
		{
			clearInterval(this.intervalId)
			this.isRunning = false
		}
	}

	private updatePhysics()
	{
		if (this.isRunning)
            this.world.step(1/60)
	}
}