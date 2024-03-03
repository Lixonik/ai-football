const { roundToHund, normalize, do180 } = require("./math_utils")
const { FLAGS } = require("./constants")
const actions = require("./actions")
const { isNil, isDefined } = require("./utils")

const DIST_BALL = 0.5
const DIST_FLAG = 3
const FOLLOW_ANGLE = 20
const MAX_GOAL_DIST = 35
const KICK_FORCE = 125
const DRIBBLE_FORCE = 20
const SEARCH_ANGLE = 90
const SPEED = 100

class Controller {
	constructor(agent) {
		this.agent = agent
		this.type = []
	}

	move(x, y) {
		this.agent.socketSend("move", `${x} ${y}`)
	}

	kick(force, angle = 0) {
		this.agent.socketSend("kick", `${force} ${angle}`)
	}

	dash(velocity) {
		this.agent.socketSend("dash", `${velocity}`)
	}

	turn(angle) {
		this.agent.socketSend("turn", `${angle}`)
	}

	getAction() {
		let action = null
		while (isNil(action)) {
			action = () => {
			}
			if (this.ballIsNear()) {
				let enemyGates = this.agent.side === "l" ? FLAGS.gr : FLAGS.gl
				if (FLAGS.distance(this.agent, enemyGates) <= MAX_GOAL_DIST) {
					let angle = this.getAngle(this.agent, this.agent.zeroVector, enemyGates)
					action = () => {
						this.kick(KICK_FORCE, -angle)
					}
					break
				}
			}

			if (this.type.length === 0)
				break

			switch (this.type[0].name) {
				case "GOTO":
					action = this.goTo(this.type[0])
					break
				case "FOLLOW":
				case "REACH":
					action = this.follow(this.type[0])
					break
			}
		}
		return action
	}

	ballIsNear() {
		let target = this.agent.objects.find(obj => obj.type === "ball")
		if (isNil(target))
			return false
		let dist = FLAGS.distance(this.agent, target)
		return dist <= DIST_BALL
	}

	getAngle(pos, dir, targetPos) {
		let v = normalize(pos, targetPos)
		let angle = do180((-Math.atan2(v.y, v.x) - Math.atan2(dir.y, dir.x)) * 180 / Math.PI)
		return angle
	}

	pushAction(...args) {
		const [actionType, ...opts] = args
		this.type.push(new actionType(...opts))
	}

	clearType() {
		this.type = []
	}

	stop() {
		if (this.type.length !== 0)
			this.type.shift()
	}

	follow(object) {
		let target = this.agent.objects.find(obj => object.equals(obj))
		if (isNil(target))
			return () => {
				this.turn(SEARCH_ANGLE)
			}
		object.target = { x: target.x, y: target.y }
		return this.goTo(object)
	}

	goTo(object) {
		let dist = FLAGS.distance(this.agent, object.target)

		let angle = this.getAngle(this.agent, this.agent.zeroVector, object.target)

		if (dist <= DIST_BALL && object.name !== "FOLLOW") {
			this.type.shift()
			return null
		}

		if (isDefined(object.isBall) && object.isBall) {
			if (dist > DIST_FLAG) {
				if (this.ballIsNear()) {
					return () => {
						this.kick(DRIBBLE_FORCE, -angle)
					}
				} else {
					this.type.unshift(new actions.REACHFOLLOW("ball", false, false))
					return null
				}
			} else {
				this.type.shift()
				return null
			}
		}

		if (Math.abs(angle) > FOLLOW_ANGLE) {
			return () => {
				this.turn(-angle)
			}
		}
		if (dist > DIST_BALL) {
			return () => {
				this.dash(SPEED)
			}
		}
		return () => {
		}
	}

	parseRefereeCmd(commands) {
		let [x, y] = [null, null]
		let lines = commands.split(";")
		for (let line of lines) {
			line = line.trim()
			if (line.startsWith("next ")) {
				line = line.slice(5, line.length)
			} else {
				this.type = []
			}

			if (line.startsWith("goto")) {
				let params = line.split(" ")
				if (params.length < 4 && !(params[1] in FLAGS)) {
					console.log(Object.keys(FLAGS), params[1])
					console.error("Incorrect command!")
					continue
				} else if (params[1] in FLAGS) {
					x = FLAGS[params[1]].x
					y = -FLAGS[params[1]].y
				}
				let vx = x ?? parseInt(params[1])
				let vy = y ?? parseInt(params[2])
				if (isNaN(vx) || isNaN(vy) ||
					vx > 57 || vx < -57 || vy > 39 || vy < -39 ||
					(params[3] !== "true" && params[3] !== "false" && params[2] !== "true" && params[2] !== "false")) {
					console.error("Incorrect values!")
					continue
				}
				this.pushAction(actions.GOTO, { x: vx, y: vy }, params[3] === "true" || params[2] === "true")
				continue
			}
			if (line.startsWith("reach")) {
				let params = line.split(" ")
				if (params.length === 2 && params[1].toLowerCase() === "ball") {
					this.pushAction(actions.REACHFOLLOW, "ball", false)
				} else if (params.length === 3) {
					let number = parseInt(params[2])
					if (isNaN(number)) {
						console.error("Incorrect values!")
						continue
					}
					this.pushAction(actions.REACHFOLLOW, "player", false, params[1], number)
				} else console.error("Incorrect command!")
				continue
			}
			if (line.startsWith("follow")) {
				let params = line.split(" ")
				if (params.length === 2 && params[1].toLowerCase() === "ball") {
					this.pushAction(actions.REACHFOLLOW, "ball", true)
				} else if (params.length === 3) {
					let number = parseInt(params[2])
					if (isNaN(number)) {
						console.error("Incorrect values!")
						continue
					}
					this.pushAction(actions.REACHFOLLOW, "player", true, params[1], number)
				} else console.error("Incorrect command!")
				continue
			}

			if (line.startsWith("stop")) {
				this.stop()
				continue
			}
			if (line.startsWith("clear")) {
				this.clearType()
				continue
			}
		}
	}

}

module.exports = Controller
