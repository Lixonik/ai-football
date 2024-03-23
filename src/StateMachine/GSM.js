const { FLAGS, AGENT_CHARACTERISTICS } = require("../constants")
const { getAngle } = require("../math_utils")
const { isNil, isDefined } = require("../utils")

class GSM {
	constructor(agent) {
		this.agent = agent
		this.memory = agent.memory
		this.state = { n: "wait", next: false }
		this.controller = agent.controller
		this.current = "start"
		this.next = true
		this.action = null

		this.initial = { x: 51, y: 0 }

		this.nodes = {
			start: { n: "start", e: ["closeBall", "nearBall", "farBall"] },
			closeBall: { n: "closeBall", e: ["catch"] },
			catch: { n: "catch", e: ["kick"] },
			kick: { n: "kick", e: ["start"] },
			nearBall: { n: "nearBall", e: ["intercept"] },
			memoryUpdate: { n: "memoryUpdate", e: ["start"] },
			farBall: { n: "farBall", e: ["backToGates", "controlBall"] },
			controlBall: { n: "controlBall", e: ["start"] },
			intercept: { n: "intercept", e: ["start"] },
			wait: { n: "wait", e: ["start"] },
			backToGates: { n: "backToGates", e: ["start"] }
		}

		this.memoryUpdateGuard = () => {
			return this.memory.age > AGENT_CHARACTERISTICS.UPDATE_MEMORY
		}

		this.edges = {
			start_closeBall: {
				guard: (memory) => {
					return FLAGS.distance(memory.rem.pos, memory.rem.ball) < AGENT_CHARACTERISTICS.DIST_BALL * 2
				}
			},
			start_nearBall: {
				guard: (memory) => {
					return FLAGS.distance(memory.rem.pos, memory.rem.ball) < AGENT_CHARACTERISTICS.INTERCEPT_DIST
				}
			},
			start_farBall: {
				guard: (memory) => {
					return FLAGS.distance(memory.rem.pos, memory.rem.ball) > AGENT_CHARACTERISTICS.INTERCEPT_DIST
				}
			},
			closeBall_catch: {},
			catch_kick: {},
			kick_start: {},
			controlBall_start: {},
			backToGates_start: {},
			intercept_start: {
				guard: (memory) => {
					return FLAGS.distance(memory.rem.pos, memory.rem.ball) > AGENT_CHARACTERISTICS.DIST_BALL * 2
				},
				action: "interceptBall"
			},
			wait_start: {},
			nearBall_controlBall: {
				guard: (memory) => {
					return FLAGS.distance(memory.rem.pos, memory.rem.ball) > AGENT_CHARACTERISTICS.INTERCEPT_DIST
				}
			},
			nearBall_intercept: {},
			memoryUpdate_start: {
				guard: (memory) => {
					return memory.age > AGENT_CHARACTERISTICS.UPDATE_MEMORY
				},
				action: "updateMemory"
			},
			farBall_controlBall: {
				guard: (memory) => {
					this.destination = { x: this.memory.rem.pos.x, y: Math.min(Math.max(this.memory.rem.pos, -5), 5) }
					return FLAGS.distance(memory.rem.pos, this.destination) > AGENT_CHARACTERISTICS.DIST_BALL * 3
				},
				action: "moveAccordingly"
			},
			farBall_backToGates: {
				guard: (memory) => {
					return FLAGS.distance(memory.rem.pos, this.initial) > AGENT_CHARACTERISTICS.DIST_BALL
				},
				action: "moveToGates"
			}
		}
		this.actions = {
			wait: () => {
				let angle = getAngle(this.agent, this.agent.zeroVector, this.memory.rem.ball)
				return this.controller.turn(-angle)
			},
			kick: () => {
				let angle = getAngle(this.agent, this.agent.zeroVector, this.memory.rem.enemyGates)
				return this.controller.kick(AGENT_CHARACTERISTICS.KICKOUT_FORCE, -angle)
			},
			catch: () => {
				let angle = getAngle(this.agent, this.agent.zeroVector, this.memory.rem.ball)
				return this.controller.catch(-angle)
			},
			interceptBall: () => {
				let angle = getAngle(this.agent, this.agent.zeroVector, this.memory.rem.ball)
				if (Math.abs(angle) > AGENT_CHARACTERISTICS.FOLLOW_ANGLE) {
					return this.controller.turn(-angle)
				}
				return this.controller.dash(AGENT_CHARACTERISTICS.SPEED)
			},
			moveAccordingly: () => {
				this.destination = { x: this.memory.rem.pos.x, y: Math.min(Math.max(this.memory.rem.pos, -5), 5) }
				let angle = getAngle(this.agent, this.agent.zeroVector, this.destination)
				if (Math.abs(angle) > AGENT_CHARACTERISTICS.FOLLOW_ANGLE) {
					return this.controller.turn(-angle)
				}
				return this.controller.dash(AGENT_CHARACTERISTICS.SPEED)
			},
			moveToGates: () => {
				let angle = getAngle(this.agent, this.agent.zeroVector, this.initial)
				if (Math.abs(angle) > AGENT_CHARACTERISTICS.FOLLOW_ANGLE) {
					return this.controller.turn(-angle)
				}
				return this.controller.dash(AGENT_CHARACTERISTICS.SPEED)
			},
			updateMemory: () => {
				return this.memory.updateMemory(this.controller, "goalie", this)
			}
		}
	}
}

module.exports = GSM