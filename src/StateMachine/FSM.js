const { FLAGS, AGENT_CHARACTERISTICS } = require("../constants")
const { getAngle } = require("../math_utils")
const { isNil, isDefined } = require("../utils")

class FSM {
	constructor(agent) {
		this.memory = agent.memory
		this.state = { n: "start", next: true }
		this.agent = agent
		this.controller = agent.controller
		this.current = "start"
		this.next = true
		this.action = null
		this.nodes = {
			start: { n: "start", e: ["nearBall", "farBall"] },
			nearBall: { n: "nearBall", e: ["gatesNear", "gatesFar"] },
			memoryUpdate: { n: "memoryUpdate", e: ["start"] },
			farBall: { n: "farBall", e: ["nearBall"] },
			gatesNear: { n: "gatesNear", e: ["start"] },
			gatesFar: { n: "gatesFar", e: ["gatesNear"] }
		}

		this.memoryUpdateGuard = () => {
			return this.memory.age > AGENT_CHARACTERISTICS.UPDATE_MEMORY
		}

		this.edges = {
			start_nearBall: {
				guard: (memory) => {
					return FLAGS.distance(memory.rem.pos, memory.rem.ball) < AGENT_CHARACTERISTICS.DIST_BALL
				}
			},
			start_farBall: {
				guard: (memory) => {
					return FLAGS.distance(memory.rem.pos, memory.rem.ball) > AGENT_CHARACTERISTICS.DIST_BALL
				},
				action: "moveToBall"
			},
			nearBall_gatesNear: {
				guard: (memory) => {
					return FLAGS.distance(memory.rem.pos, memory.rem.enemyGates) < AGENT_CHARACTERISTICS.MAX_GOAL_DIST
				}
			},
			nearBall_gatesFar: {
				guard: (memory) => {
					return FLAGS.distance(memory.rem.pos, memory.rem.enemyGates) > AGENT_CHARACTERISTICS.MAX_GOAL_DIST &&
						FLAGS.distance(memory.rem.pos, memory.rem.ball) < AGENT_CHARACTERISTICS.DIST_BALL
				},
				action: "dribbleToGates"
			},
			memoryUpdate_start: {
				guard: (memory) => {
					return memory.age > AGENT_CHARACTERISTICS.UPDATE_MEMORY
				},
				action: "updateMemory"
			},
			farBall_nearBall: {
				guard: (memory) => {
					return FLAGS.distance(memory.rem.pos, memory.rem.ball) < AGENT_CHARACTERISTICS.DIST_BALL
				}
			},
			gatesNear_start: {
				guard: () => {
					return true
				},
				action: "performGoal"
			},
			gatesFar_gatesNear: {
				guard: (memory) => {
					return FLAGS.distance(memory.rem.pos, memory.rem.enemyGates) < AGENT_CHARACTERISTICS.MAX_GOAL_DIST
				},
				action: "dribbleToGates"
			}
		}
		this.actions = {
			dribbleToGates: () => {
				let angle = getAngle(this.agent, this.agent.zeroVector, this.memory.rem.enemyGates)
				return this.controller.kick(AGENT_CHARACTERISTICS.DRIBBLE_FORCE, -angle)
			},
			moveToBall: () => {
				let angle = getAngle(this.agent, this.agent.zeroVector, this.memory.rem.ball)
				if (Math.abs(angle) > AGENT_CHARACTERISTICS.FOLLOW_ANGLE) {
					return this.controller.turn(-angle)
				}
				if (isNil(this.agent.objects.find(el => el.type === "ball"))) {
					this.memory.age = 1000
					return this.controller.turn(AGENT_CHARACTERISTICS.SEARCH_ANGLE)
				}
				return this.controller.dash(AGENT_CHARACTERISTICS.SPEED)
			},
			performGoal: () => {
				let angle = getAngle(this.agent, this.agent.zeroVector, this.memory.rem.enemyGates)
				return this.controller.kick(AGENT_CHARACTERISTICS.KICK_FORCE, -angle)
			},
			updateMemory: () => {
				return this.memory.updateMemory(this.controller, "kicker", this)
			}
		}
	}
}

module.exports = FSM