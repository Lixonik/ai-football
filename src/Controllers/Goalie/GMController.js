const { FLAGS, AGENT_CHARACTERISTICS } = require("../../constants")
const { getAngle } = require("../../math_utils")
const { isNil, isDefined } = require("../../utils")

const GLController = require("./GLController")

class GMController {
    constructor(agent) {
        this.agent = agent
        this.waysToLook = null
        this.lcontroller = new GLController(agent)
    }

    getAction(data) {
        return this.lcontroller.getAction(data)
    }

    updateMemory(data, memory) {
        let pos = data.pos
        if (isNil(this.waysToLook)) {
            if (data.side === "r")
                this.waysToLook = [
                    {x: pos.x - 10, y: pos.y + 10},
                    {x: pos.x - 10, y: pos.y - 10}
                ]
            else
                this.waysToLook = [
                    {x: pos.x + 10, y: pos.y + 10},
                    {x: pos.x + 10, y: pos.y - 10}
                ]
        }
        let angle = getAngle(this.agent, this.agent.zeroVector, this.waysToLook[0])
        this.waysToLook.shift()
        if (this.waysToLook.length === 0) {
            this.waysToLook = null
            memory.age = 0
        }
        return this.agent.controller.turn(-angle)
    }
}

module.exports = GMController