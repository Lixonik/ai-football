const { FLAGS, AGENT_CHARACTERISTICS } = require("./constants")
const { getAngle } = require("./math_utils")
const { isNil, isDefined } = require("./utils")

class Memory {
	constructor(agent) {
		this.agent = agent
		this.tick = 0
		this.stack = []
		this.age = 1000
		this.rem = null
		this.updated = 0
        this.moreActs = -1
        this.heardAllies = []
	}

	analyze() {
		this.age++
		let cell = this.formMemoryCell()
		this.stack.push(cell)
		this.rem = this.retrieveLastInfo()
        this.heardAllies = this.agent.soundManager.heardAllies
	}

    clearMemory() {
        this.stack = []
        this.age = 1000;
    }

	formMemoryCell() {
		let ball = this.agent.objects.find(el => el.type === "ball")
		let enemies = this.agent.objects.filter(el => el.type === "player" && !el.ally)
		let allies = this.agent.objects.filter(el => el.type === "player" && el.ally)
		return {
			myGates: this.agent.side === "l" ? FLAGS.gl : FLAGS.gr,
			enemyGates: this.agent.side === "l" ? FLAGS.gr : FLAGS.gl,
			tick: this.tick,
			pos: { x: this.agent.x, y: this.agent.y },
			ball: ball,
			enemies: enemies,
			allies: allies
		}
	}

	retrieveLastInfo() {
		let retCell = {
			myGates: this.agent.side === "l" ? FLAGS.gl : FLAGS.gr,
			enemyGates: this.agent.side === "l" ? FLAGS.gr : FLAGS.gl,
			pos: -1,
			ball: -1,
			enemies: -1,
			allies: -1
		}
		for (let i = this.stack.length - 1; i >= 0; i--) {
			if (retCell.pos != -1 && retCell.ball != -1 && retCell.enemies != -1 && retCell.allies != -1) {
				break
			}
			let el = this.stack[i]
			if (isDefined(el.pos))
				retCell.pos = el.pos
			if (isDefined(el.ball))
				if (isDefined(el.ball.x) && isDefined(el.ball.y))
					retCell.ball = el.ball
			if (isDefined(el.enemies))
				retCell.enemies = el.enemies
			if (isDefined(el.allies))
				retCell.allies = el.allies
		}
		// if (retCell.ball)
		//     console.log("Last Ball coo: " + retCell.ball.x + " " + retCell.ball.y)
		return retCell
	}

	// updateMemory(controller, type, at) {
	// 	let pos = at.memory.rem.pos
	// 	let gates = at.memory.rem.enemyGates
	// 	if (isNil(this.waysToLook))
	// 		if (type === "kicker")
	// 			this.waysToLook = [
	// 				{ x: pos.x, y: pos.y + 10 },
	// 				{ x: pos.x + 10, y: pos.y },
	// 				{ x: pos.x, y: pos.y - 10 },
	// 				{ x: pos.x - 10, y: pos.y }
	// 			]
	// 		else if (type === "goalie") {
	// 			if (gates === FLAGS.gr)
	// 				if (FLAGS.distance(pos, at.initial) > AGENT_CHARACTERISTICS.DIST_BALL * 5) {
	// 					this.waysToLook = [
	// 						{ x: pos.x, y: pos.y + 10 },
	// 						{ x: pos.x + 10, y: pos.y },
	// 						{ x: pos.x, y: pos.y - 10 },
	// 						{ x: pos.x - 10, y: pos.y }
	// 					]
	// 				} else {
	// 					this.waysToLook = [
	// 						{ x: pos.x + 10, y: pos.y + 10 },
	// 						{ x: pos.x + 10, y: pos.y - 10 }
	// 					]
	// 				}
	// 			else if (FLAGS.distance(pos, at.initial) > AGENT_CHARACTERISTICS.DIST_BALL * 5) {
	// 				this.waysToLook = [
	// 					{ x: pos.x, y: pos.y + 10 },
	// 					{ x: pos.x + 10, y: pos.y },
	// 					{ x: pos.x, y: pos.y - 10 },
	// 					{ x: pos.x - 10, y: pos.y }
	// 				]
	// 			} else {
	// 				this.waysToLook = [
	// 					{ x: pos.x - 10, y: pos.y + 10 },
	// 					{ x: pos.x - 10, y: pos.y - 10 }
	// 				]
	// 			}

	// 		}
	// 	let way = this.updated
	// 	let angle = getAngle(at.agent, at.agent.zeroVector, this.waysToLook[way])
	// 	this.updated++
	// 	if (this.updated === this.waysToLook.length) {
	// 		this.updated = 0
	// 		this.age = 0
	// 		this.waysToLook = null
	// 	}

	// 	return controller.turn(-angle)
	// }
}

module.exports = Memory