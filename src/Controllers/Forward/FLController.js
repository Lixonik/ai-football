const { FLAGS, AGENT_CHARACTERISTICS } = require("../../constants")
const { getAngle } = require("../../math_utils")
const { isNil, isDefined } = require("../../utils")

class FLController {
    constructor(agent) {
        this.agent = agent
        this.controller = agent.controller
        this.data = null
    }

    getActionForForward(data) {
        this.data = data
        let circle = this.getCircle()
        if (data.canKick) {
            let indanger = FLAGS.distance(data.pos, circle) > circle.r * 4 / 5
            for (let e of data.enemies) {
                if (FLAGS.distance(data.pos, e) <= AGENT_CHARACTERISTICS.ENEMY_ZONE) {
                    indanger = true
                    break
                }
            }
            if (indanger) {
                return this.passSomeone()
            } else {
                return this.moveToGates()
            }
        } else {
            let atLeastOneNearer = false
            for (let e of data.allies) {
                if (FLAGS.distance(data.ball, e) < FLAGS.distance(data.pos, data.ball)) {
                    atLeastOneNearer = true
                    break
                }
            }
            if (!atLeastOneNearer && FLAGS.distance(data.pos, data.ball) < circle.r) {
                return this.moveToGates()
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

    getActionForDefender(data) {
        this.data = data
        let circle = this.getCircle()
        let atLeastOneNearer = false
        for (let e of data.allies) {
            if (FLAGS.distance(data.ball, e) < FLAGS.distance(data.pos, data.ball)) {
                atLeastOneNearer = true
                break
            }
        }
        if (!atLeastOneNearer && FLAGS.distance(data.pos, data.ball) < circle.r) {
            if (data.canKick) {
                return this.passSomeone()
            } else {
                return this.getBall()
            }
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

    passSomeone() {
        let where = null
        let min = FLAGS.distance(this.data.enemyGates, this.data.pos)
        for (let e of this.data.allies) {
            let dist = FLAGS.distance(this.data.enemyGates, e)
            if (dist < min) {
                where = e
                min = dist
                break
            }
        }
        if (isNil(where)) {
            return this.kickToGates()
        } else {
            return this.kickToPoint(where)
        }
    }


    getBall() {
        let angle = getAngle(this.agent, this.agent.zeroVector, this.data.ball)
        if (Math.abs(angle) > AGENT_CHARACTERISTICS.FOLLOW_ANGLE) {
            return this.controller.turn(-angle)
        }
        return this.controller.dash(AGENT_CHARACTERISTICS.RUN)
    }

    kickToGates() {
        let angle = getAngle(this.agent, this.agent.zeroVector, this.data.enemyGates)
        return this.controller.kick(AGENT_CHARACTERISTICS.KICK_FORCE, -angle)
    }

    moveToGates() {
        if (this.data.canKick) {
            let angle = getAngle(this.agent, this.agent.zeroVector, this.data.enemyGates)
            if (Math.abs(angle) > AGENT_CHARACTERISTICS.FOLLOW_ANGLE) {
                return () => {
                    this.controller.turn(-angle)
                }
            }
            if (FLAGS.distance(this.data.pos, this.data.enemyGates) > AGENT_CHARACTERISTICS.MAX_GOAL_DIST)
                return this.controller.kick(AGENT_CHARACTERISTICS.DRIBBLE_FORCE, -angle)
            else
                return this.controller.kick(AGENT_CHARACTERISTICS.KICK_FORCE, -angle)
        } else {
            let angle = getAngle(this.agent, this.agent.zeroVector, this.data.ball)
            if (Math.abs(angle) > AGENT_CHARACTERISTICS.FOLLOW_ANGLE) {
                return this.controller.turn(-angle)
            }
            return this.controller.dash(AGENT_CHARACTERISTICS.RUN)
        }
    }

    moveToSpot(spot) {
        let angle = getAngle(this.agent, this.agent.zeroVector, spot)
        if (Math.abs(angle) > AGENT_CHARACTERISTICS.FOLLOW_ANGLE*3) {
            return this.controller.turn(-angle)
        }
        return this.controller.dash(AGENT_CHARACTERISTICS.RUN)
    }

    controllBall() {
        let angle = getAngle(this.agent, this.agent.zeroVector, this.data.ball)
        return this.controller.turn(-angle)
    }

    kickToPoint(point) {
        let angle = getAngle(this.agent, this.agent.zeroVector, point)
        return this.controller.kick(AGENT_CHARACTERISTICS.FORCE_PER_DISTANCE * FLAGS.distance(this.data.pos, point), -angle)
    }


    getCircle() {
        const positions = {
            1: {x: 10, y: 0, r: 20},
            2: {x: 32, y: -15, r: 19},
            3: {x: 32, y: 15, r: 19},
            4: {x: -20, y: -18, r: 16},
            5: {x: -20, y: 18, r: 16},
            6: {x: 5, y: -20, r: 16},
            7: {x: 5, y: 20, r: 16},
            8: {x: -37, y: -20, r: 16},
            9: {x: -34, y: 0, r: 18},
            10: {x: -37, y: 20, r: 16},
        }
        let spot = positions[this.data.playerId]
        spot.ir = [4, 5, 8, 9, 10].includes(this.data.playerId) ? spot.r * 2 / 3 : spot.r * 2 / 3

        if (this.data.side === "r") {
            spot.x *= -1
            spot.y *= -1
        }
        return spot
    }
}

module.exports = FLController