const { FLAGS, AGENT_CHARACTERISTICS } = require("../../constants")
const { getAngle } = require("../../math_utils")
const { isNil, isDefined } = require("../../utils")

class GLController {
    constructor(agent) {
        this.agent = agent
        this.controller = agent.controller
        this.data = null
        this.catched = false
    }

    getAction(data) {
        this.data = data
        let circle = this.getCircle()
        if (data.canCatch && !this.catched) {
            return this.catch()
        } else if (data.canKick || this.catched) {
            return this.kickToGates()
        } else {
            let atLeastOneNearer = false
            for (let e of data.allies) {
                if (FLAGS.distance(data.ball, e) < FLAGS.distance(data.pos, data.ball)) {
                    atLeastOneNearer = true
                    break
                }
            }
            if (!atLeastOneNearer && FLAGS.distance(data.pos, data.ball) < circle.r) {
                return this.getBall()
            } else {
                let ballcoo = this.data.ball

                let coordToGo
                let distance = FLAGS.distance(circle, ballcoo)
                if (distance <= circle.ir) {
                    coordToGo = ballcoo
                } else {
                    let offset = circle.ir * (ballcoo.x - circle.x) / distance
                    let newx1 = circle.x - offset
                    let newx2 = circle.x + offset
                    let newy1 = (newx1 - circle.x) * (ballcoo.y - circle.y) / (ballcoo.x - circle.x) + circle.y
                    let newy2 = (newx2 - circle.x) * (ballcoo.y - circle.y) / (ballcoo.x - circle.x) + circle.y
                    if (FLAGS.distance({x: newx1, y: newy1}, ballcoo) < FLAGS.distance({x: newx2, y: newy2}, ballcoo))
                        coordToGo = {x: newx1, y: newy1}
                    else
                        coordToGo = {x: newx2, y: newy2}
                }
                if (FLAGS.distance(data.pos, coordToGo) > AGENT_CHARACTERISTICS.DIST_BALL) {
                    return this.moveToSpot(coordToGo)
                } else {
                    return this.controllBall()
                }
            }
        }
    }

    catch() {
        this.catched = true
        let angle = getAngle(this.agent, this.agent.zeroVector, this.data.ball)
        return this.controller.catch(-angle)
    }

    moveToSpot(spot) {
        let angle = getAngle(this.agent, this.agent.zeroVector, spot)
        if (Math.abs(angle) > AGENT_CHARACTERISTICS.FOLLOW_ANGLE*2) {
            return this.controller.turn(-angle)
        }
        return this.controller.dash(AGENT_CHARACTERISTICS.RUN)
    }

    controllBall() {
        let angle = getAngle(this.agent, this.agent.zeroVector, this.data.ball)
        return this.controller.turn(-angle)
    }

    getBall() {
        let angle = getAngle(this.agent, this.agent.zeroVector, this.data.ball)
        if (Math.abs(angle) > AGENT_CHARACTERISTICS.FOLLOW_ANGLE) {
            return this.controller.turn(-angle)
        }
        if(FLAGS.distance(this.data.pos, this.data.ball) < 5)
            return this.controller.dash(AGENT_CHARACTERISTICS.SPEED)
        return this.controller.dash(AGENT_CHARACTERISTICS.RUN)
    }

    kickToGates() {
        this.catched = false
        let angle = getAngle(this.agent, this.agent.zeroVector, this.data.enemyGates)
        return this.controller.kick(AGENT_CHARACTERISTICS.KICK_FORCE, -angle)
    }

    getCircle() {
        let spot = {x: -55, y: 0, r: 10}
        spot.ir = spot.r * 2 / 3

        if (this.data.side === "r") {
            spot.x *= -1
            spot.y *= -1
        }
        return spot
    }
}

module.exports = GLController