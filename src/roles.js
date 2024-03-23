const { roundToHund, normalize, do180 } = require("./math_utils")
const { FLAGS, AGENT_CHARACTERISTICS } = require("./constants")
const { isNil, isDefined } = require("./utils")


class Player {
	constructor(agent) {
		this.agent = agent
		this.controller = this.agent.controller
		this.goal = false
	}

	update() {
		this.updateState()
		return this.updateAction()
	}

	updateAction() {

	}

	updateState() {

	}

	goTo(target, speed, isBall = false) {
		let dist = FLAGS.distance(this.agent, target)

		let angle = this.getAngle(this.agent, this.agent.zeroVector, target)


		if (isBall)
			return () => {
				this.controller.kick(AGENT_CHARACTERISTICS.DRIBBLE_FORCE, -angle)
			}

		if (Math.abs(angle) > AGENT_CHARACTERISTICS.FOLLOW_ANGLE) {
			return () => {
				this.controller.turn(-angle)
			}
		}
		if (dist > DIST_BALL) {
			return () => {
				this.controller.dash(speed)
			}
		}
		return () => {
			this.controller.turn(-angle)
		}
	}

	getAngle(pos, dir, targetPos) {
		let v = normalize(pos, targetPos)
		let angle = do180((-Math.atan2(v.y, v.x) - Math.atan2(dir.y, dir.x)) * 180 / Math.PI)
		return angle
	}
}

class Goalie extends Player {
	constructor(agent) {
		super(agent)
		this.name = "goalie"
		this.previousBall = null
		this.ball = null
		this.state = "root"
		this.action = null
		this.pointInGates = { x: -51, y: 0 }
		this.catched = false
		this.posAccordingly = null
	}

	updateState() {
		this.action = null
		let tmpBall = this.agent.objects.find(el => el.type === "ball")
		if (isDefined(tmpBall)) {
			this.previousBall = isDefined(this.ball) ? this.ball : this.previousBall
			this.ball = this.agent.objects.find(el => el.type === "ball")
		}
		while (isNil(this.action)) {
			switch (this.state) {
				case "root":
					if (this.catched)
						this.action = "kick"
					else
						this.state = "calcBall"
					break
				case "calcBall":
					if (isDefined(this.ball))
						this.state = "checkBall"
					else
						this.action = "findBall"
					break
				case "checkBall":
					if (FLAGS.distance(this.agent, this.ball) <= AGENT_CHARACTERISTICS.DIST_BALL * 16)
						this.state = "smallDistance"
					else
						this.state = "bigDistance"
					break
				case "smallDistance":
					if (FLAGS.distance(this.agent, this.ball) > AGENT_CHARACTERISTICS.DIST_FLAG)
						this.action = "getBall"
					else
						this.state = "blockGoal"
					break
				case "readyToBlockGoal":
					if (isNil(tmpBall) || FLAGS.distance(this.agent, this.ball) > AGENT_CHARACTERISTICS.DIST_FLAG) {
						this.action = "rotateOnMemory"
						this.ball = { x: 0, y: 0 }
					} else
						this.state = "blockGoal"
					break
				case "blockGoal":
					if (FLAGS.distance(this.agent, this.ball) > AGENT_CHARACTERISTICS.DIST_BALL * 4)
						this.action = "kick"
					else
						this.action = "catch"
					break
				case "bigDistance":
					if (FLAGS.distance(this.agent, this.pointInGates) <= AGENT_CHARACTERISTICS.DIST_BALL * 2)
						this.action = "backToGates"
					else
						this.state = "control"
					break
				case "control":
					if (Math.abs(this.agent.y - this.ball.y) <= AGENT_CHARACTERISTICS.DIST_BALL * 4)
						this.action = "rotateOnMemory"
					else
						this.action = "moveToBall"
					break
			}
		}
	}

	updateAction() {
		switch (this.action) {
			case "catch":
				return this.catchBall()
			case "kick":
				return this.kickBall()
			case "getBall":
				return this.getBall()
			case "backToGates":
				return this.backToGates()
			case "rotateOnMemory":
				return this.rotateOnMemory()
			case "findBall":
				return this.findBall()
			case "moveToBall":
				return this.moveToBall()
		}
	}

	catchBall() {
		this.catched = true
		this.state = "root"
		let angle = this.getAngle(this.agent, this.agent.zeroVector, this.ball)
		return () => {
			this.controller.catch(-angle)
		}
	}

	kickBall() {
		this.catched = false
		this.state = "root"
		this.ball = { x: 0, y: 0 }
		let angle = this.getAngle(this.agent, this.agent.zeroVector, this.agent.side === "r" ? FLAGS.gl : FLAGS.gr)
		return () => {
			this.controller.kick(AGENT_CHARACTERISTICS.KICK_FORCE, -angle)
		}
	}

	getBall() {
		let x3 = this.agent.x
		let y1 = this.ball.y, x1 = this.ball.x
		let y2 = this.previousBall.y, x2 = this.previousBall.x
		this.posAccordingly = {
			x: x3,
			y: y1 + ((y2 - y1) / (x2 - x1)) * (x3 - x1)
		}
		if (FLAGS.distance(this.agent, this.posAccordingly) <= AGENT_CHARACTERISTICS.DIST_BALL * 2) {
			this.state = "readyToBlockGoal"
			this.updateState()
			return this.updateAction()
		}
		return this.goTo(this.posAccordingly, AGENT_CHARACTERISTICS.RUN)
	}

	backToGates() {
		return this.goTo(this.pointInGates, AGENT_CHARACTERISTICS.SPEED)
	}

	rotateOnMemory() {
		this.state = "root"
		let angle = this.getAngle(this.agent, this.agent.zeroVector, this.ball)
		return () => {
			this.controller.turn(-angle)
		}
	}

	findBall() {
		if (isDefined(this.ball)) {
			let angle = this.getAngle(this.agent, this.agent.zeroVector, this.previousBall)
			return () => {
				this.controller.turn(-angle)
			}
		}
		let tmpBall = this.agent.objects.find(el => el.type === "ball")
		if (isDefined(tmpBall)) {
			this.ball = tmpBall
			this.state = "root"
			this.updateState()
			return this.updateAction()
		}
		return () => {
			this.controller.turn(AGENT_CHARACTERISTICS.SEARCH_ANGLE)
		}
	}

	moveToBall() {
		this.posAccordingly = {
			x: this.agent.x,
			y: Math.min(5, Math.max(-5, this.ball.y))
		}
		if (FLAGS.distance(this.agent, this.posAccordingly) <= DIST_BALL * 2) {
			this.state = "readyToBlockGoal"
			this.updateState()
			return this.updateAction()
		}
		return this.goTo(this.posAccordingly, AGENT_CHARACTERISTICS.SPEED)
	}
}


class Forward extends Player {
	constructor(agent) {
		super(agent)
		this.name = "forward"
		this.ballMemory = null
		this.ball = { x: 0, y: 0 }
		this.state = "root"
		this.action = null
		this.target = FLAGS.fplc
		this.end = false
		this.ready = false
		this.throw = false
	}

	updateState() {
		this.state = "root"
		this.action = null
		this.ball = this.agent.objects.find(el => el.type === "ball")
		if (isDefined(this.ball)) {
			this.ballMemory = this.ball
		}
		this.gates = this.agent.side === "r" ? FLAGS.gl : FLAGS.gr
		while (isNil(this.action)) {
			switch (this.state) {
				case "root":
					if (this.end)
						this.action = "wait"
					else
						this.state = "continued"
					break
				case "continued":
					if (isDefined(this.target))
						this.action = "moveToTarget"
					else
						this.state = "ballPerformance"
					break
				case "ballPerformance":
					if (isNil(this.ball))
						this.action = "searching"
					else
						this.state = "moveToBall"
					break
				case "moveToBall":
					if (FLAGS.distance(this.agent, this.ball) > AGENT_CHARACTERISTICS.DIST_BALL)
						this.action = "getBall"
					else
						this.state = "action"
					break
				case "action":
					if (this.throw)
						this.action = "givePass"
					else
						this.action = "throw"
			}
		}
	}

	updateAction() {
		switch (this.action) {
			case "searching":
				return this.searching()
			case "moveToTarget":
				return this.moveToTarget()
			case "getBall":
				return this.goTo(this.ball, AGENT_CHARACTERISTICS.SPEED)
			case "givePass":
				return this.givePass()
			case "throw":
				return this.throwB()
			case "wait":
				// default:
				// console.log(this.action)
				return () => {
				}
		}
	}

	searching() {
		if (isDefined(this.ballMemory)) {
			let angle = this.getAngle(this.agent, this.agent.zeroVector, this.ballMemory)
			this.ballMemory = null
			return () => {
				this.controller.turn(-angle)
			}
		}
		return () => {
			this.controller.turn(AGENT_CHARACTERISTICS.FOLLOW_ANGLE)
		}
	}

	moveToTarget() {
		if (FLAGS.distance(this.agent, this.target) <= AGENT_CHARACTERISTICS.DIST_BALL) {
			this.target = null
			return () => {
			}
		}
		return this.goTo(this.target, AGENT_CHARACTERISTICS.SPEED)
	}

	givePass() {
		let destination = { x: 30, y: -8 }
		let angle = this.getAngle(this.agent, this.agent.zeroVector, destination)
		if (this.ready) {
			this.controller.sayGo()
			this.end = true
			return () => {
				this.controller.kick(FLAGS.distance(this.agent, destination) * AGENT_CHARACTERISTICS.FORCE_PER_DISTANCE, -angle)
			}
		} else {
			this.ready = true
			return () => {
				this.controller.turn(-angle)
			}
		}
	}

	throwB() {
		let angle = this.getAngle(this.agent, this.agent.zeroVector, this.gates)
		this.throw = true
		return () => {
			this.controller.kick(30, -angle)
		}
	}
}

class Substitute extends Player {
	constructor(agent) {
		super(agent)
		this.name = "substitute"
		this.state = "root"
		this.forward = null
		this.cur = 0
		this.target = FLAGS.fplb
		this.targets = [FLAGS.fplb, FLAGS.fgrt]
		this.motion = false
		this.seeBall = false
		this.ready = false
	}

	updateState() {
		this.state = "root"
		this.action = null

		this.ball = this.agent.objects.find(el => el.type === "ball")
		if (isDefined(this.ball)) {
			this.ballMemory = this.ball
		}

		this.gates = this.agent.side === "r" ? FLAGS.gl : FLAGS.gr
		while (isNil(this.action)) {
			switch (this.state) {
				case "root":
					if (this.motion)
						this.state = "waitBall"
					else
						this.action = "moveToTarget"
					break
				case "waitBall":
					if (isDefined(this.ball) || this.seeBall) {
						this.seeBall = true
						this.state = "seeBall"
					} else {
						this.isBall = false
						this.action = "moveToTarget"
					}
					break
				case "seeBall":
					if (isNil(this.ball)) {
						this.action = "findBall"
					} else {
						this.state = "toBall"
					}
					break
				case "toBall":
					if (FLAGS.distance(this.agent, this.ball) > AGENT_CHARACTERISTICS.DIST_BALL) {
						this.target = this.ball
						this.isBall = false
						this.action = "moveToTarget"
					} else {
						this.state = "gatesPerformance"
					}
					break
				case "gatesPerformance":
					if (FLAGS.distance(this.agent, this.gates) > AGENT_CHARACTERISTICS.MAX_GOAL_DIST) {
						this.target = this.gates
						this.isBall = true
						this.action = "moveToTarget"
					} else
						this.action = "performGoal"
					break
			}
		}
	}

	updateAction() {
		switch (this.action) {
			case "moveToTarget":
				return this.moveToTarget()
			case "moveForward":
				return this.moveForward()
			case "performGoal":
				return this.performGoal()
			case "findBall":
				return this.findBall()
		}
	}

	moveToTarget() {
		if (FLAGS.distance(this.agent, this.target) < AGENT_CHARACTERISTICS.DIST_BALL) {
			this.cur++
			if (this.cur < 2) {
				this.target = this.targets[this.cur]
			} else {
				this.target = this.gates
				this.seeBall = true
			}
			return () => {
			}
		}
		return this.goTo(this.target, SPEED, this.isBall)
	}

	moveForward() {
		return () => {
			this.controller.dash(100)
		}
	}

	performGoal() {
		if (this.ready) {
			let goalie = this.agent.objects.find(el => el.team !== this.agent.team)

			let point = this.gates
			let max = FLAGS.distance(this.agent, point)

			if (FLAGS.distance(this.agent, { x: this.gates.x, y: this.gates.y + 3 }) > max) {
				max = FLAGS.distance(this.agent, { x: this.gates.x, y: this.gates.y + 3 })
				point = { x: this.gates.x, y: this.gates.y + 3 }
			}
			if (FLAGS.distance(this.agent, { x: this.gates.x, y: this.gates.y - 3 }) > max) {
				point = { x: this.gates.x, y: this.gates.y - 3 }
			}
			let angle = this.getAngle(this.agent, this.agent.zeroVector, point)

			return () => {
				// console.log("kicked")
				this.controller.kick(AGENT_CHARACTERISTICS.KICK_FORCE, -angle)
			}
		} else {
			let angle = this.getAngle(this.agent, this.agent.zeroVector, this.gates)
			this.ready = true
			return () => {
				this.controller.turn(-angle)
			}
		}
	}

	findBall() {
		if (isDefined(this.ballMemory)) {
			let angle = this.getAngle(this.agent, this.agent.zeroVector, this.ballMemory)
			this.ballMemory = null
			return () => {
				this.controller.turn(-angle)
			}
		}
		return () => {
			this.controller.turn(AGENT_CHARACTERISTICS.SEARCH_ANGLE)
		}
	}

}

module.exports = {
	Player: Player,
	Goalie: Goalie,
	Forward: Forward,
	Substitute: Substitute
}