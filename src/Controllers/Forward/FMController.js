const { FLAGS, AGENT_CHARACTERISTICS } = require("../../constants")
const { getAngle } = require("../../math_utils")
const { isNil, isDefined } = require("../../utils")

const FLController = require("./FLController")

class FMController {
    constructor(agent) {
        this.agent = agent
        this.waysToLook = null
        this.lcontroller = new FLController(agent)
    }

    getAction(data) {
        if([4,5,8,9,10].includes(data.playerId)){
            return this.lcontroller.getActionForDefender(data)
        }else{
            return this.lcontroller.getActionForForward(data)
        }
    }

    updateMemory(data, memory) {
        let pos = data.pos
        if (isNil(this.waysToLook)) {
            this.waysToLook = [
                {x: pos.x, y: pos.y + 10},
                {x: pos.x + 10, y: pos.y},
                {x: pos.x, y: pos.y - 10},
                {x: pos.x - 10, y: pos.y}
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

module.exports = FMController