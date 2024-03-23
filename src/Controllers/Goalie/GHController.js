const { FLAGS, AGENT_CHARACTERISTICS } = require("../../constants")
const { getAngle } = require("../../math_utils")
const { isNil, isDefined } = require("../../utils")

const GMController = require("./GMController")

class GHController {
    constructor(agent) {
        this.agent = agent
        this.mcontroller = new GMController(agent)
        this.data = null
    }

    getAction() {
        this.compileEverything()
        let ball = this.agent.objects.find(el => el.type === "ball")
        if (isNil(ball)) {
            if (this.agent.memory.age > AGENT_CHARACTERISTICS.UPDATE_MEMORY) {
                return this.mcontroller.updateMemory(this.data, this.agent.memory)
            } else {
                return this.mcontroller.getAction(this.data)
            }
        } else {
            this.agent.memory.age = AGENT_CHARACTERISTICS.UPDATE_MEMORY-4
            return this.mcontroller.getAction(this.data)
        }

    }

    compileEverything() {
        this.data = this.agent.memory.rem
        this.data.side = this.agent.side
        this.data.playerId = this.agent.id
        this.data.team = this.agent.team
        this.data.canKick = this.data.ball && FLAGS.distance(this.data.pos, this.data.ball) < AGENT_CHARACTERISTICS.DIST_BALL * 2
        this.data.canCatch = this.data.ball && FLAGS.distance(this.data.pos, this.data.ball) < AGENT_CHARACTERISTICS.DIST_BALL
    }
}

module.exports = GHController