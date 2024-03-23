const { FLAGS, AGENT_CHARACTERISTICS } = require("../constants")
const { getAngle } = require("../math_utils")
const { isNil, isDefined } = require("../utils")

class Manager {
	constructor(agent) {
		this.agent = agent
		this.state = agent.player_state_machine
	}

	getAction() {
		return this.execute()
	}

	execute() {
		if (this.state.memoryUpdateGuard()) {
			this.state.next = false
			this.state.current = "memoryUpdate_start"
		}
		if (this.state.next) {
			if (this.state.nodes[this.state.current]) return this.nextState()
			if (this.state.edges[this.state.current]) return this.nextEdge()
		}
		if (this.state.nodes[this.state.current]) return this.executeState()
		if (this.state.edges[this.state.current]) return this.executeEdge()
	}

	nextState() {
		let node = this.state.nodes[this.state.current]
		for (let name of node.e) {
			let edgeName = `${node.n}_${name}`
			let edge = this.state.edges[edgeName]
			if (!edge.guard || edge.guard(this.state.memory)) {
				// console.log("Found:" + edgeName)
				this.state.current = edgeName
				if (!edge.guard)
					this.state.next = true
				else
					this.state.next = false
				return this.execute()
			}
		}
		this.state.current = this.state.state.n
		this.state.next = this.state.state.next
		return this.execute()
	}

	nextEdge() {
		this.state.current = this.state.current.split("_")[1]
		this.state.next = false
		return this.execute()
	}

	executeState() {
		let node = this.state.nodes[this.state.current]
		if (this.state.actions[node.n]) {
			this.state.action = this.state.actions[node.n]
			if (!this.state.action && this.state.next)
				return this.execute()
			this.state.next = true
			return this.state.action
		} else {
			this.state.next = true
			return this.execute()
		}
	}

	executeEdge() {
		let edge = this.state.edges[this.state.current]
		if (edge.guard && edge.guard(this.state.memory) && edge.action) {
			this.state.next = false
			this.state.action = this.state.actions[edge.action]
			return this.state.action
		}
		this.state.action = null
		this.state.next = true
		return this.execute()
	}
}

module.exports = Manager