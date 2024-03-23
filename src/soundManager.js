const { Messages } = require('./constants')
const { Forward, Substitute } = require('./Roles')

class SoundManager {
  constructor(agent) {
    this.agent = agent
    this.msg = ''
  }

  scan(data) {
    let tick = data[0]
    let author = data[1]
    this.msg = data[2].replace(/"/g, '')
    if (author === 'referee') {
      this.processRefereeMessage()
      return
    }
    this.processPlayersMessage()
  }

  processRefereeMessage() {
    this.agent.gamemode = this.msg
    if (this.agent.gamemode.startsWith('goal_')) {
      // this.agent.role.goal = true
      this.agent.run = false
    }
    if (this.agent.gamemode === 'play_on') {
      if (this.agent.gamemode === 'play_on') {
        // this.agent.player_state_machine.current = 'memoryUpdate_start'
        this.agent.run = true
      }
    }
  }

  processPlayersMessage() {
    this.msg = this.msg.replace(/z/g, '-')
    this.msg = this.msg.replace(/q/g, '+')
    let arr = this.msg.split('')
    if (arr[0] !== this.agent.team.charAt(0)) {
      return
    }
    // console.log(this.msg)
    let to = -1
    switch (arr[1]) {
      case Messages.goTo:
        to = parseInt(arr[2] + arr[3])
        if (to !== this.agent.id && to !== 99) {
          return
        }
        let x = arr[4] === '-' ? (-1) * parseInt(arr[5] + arr[6]) : parseInt(arr[5] + arr[6])
        let y = arr[7] === '-' ? (-1) * parseInt(arr[8] + arr[9]) : parseInt(arr[8] + arr[9])
        // this.agent.role.target = { x: x, y: y }
        break
      case Messages.switchForward:
        to = parseInt(arr[2] + arr[3])
        if (to === this.agent.id) {
          // this.agent.role = new Forward(this.agent)
        } else {
          // if (this.agent.role.name !== "substitute")
          // 	this.agent.role = new Substitute(this.agent)
          // this.agent.role.forwardId = to
        }
        break
      case Messages.givePass:
        to = parseInt(arr[2] + arr[3])
        if (to === this.agent.id) {
          let xPlayer = arr[4] === '-' ? (-1) * parseInt(arr[5] + arr[6]) : parseInt(arr[5] + arr[6])
          let yPlayer = arr[7] === '-' ? (-1) * parseInt(arr[8] + arr[9]) : parseInt(arr[8] + arr[9])
          // this.agent.role.getBallFrom = { x: xPlayer, y: yPlayer }
        }
        break
      case Messages.sendMe:
        let playerId = parseInt(arr[2] + arr[3])
        // if (this.agent.role.name === "forward") {
        let xPlayer = arr[4] === '-' ? (-1) * parseInt(arr[5] + arr[6]) : parseInt(arr[5] + arr[6])
        let yPlayer = arr[7] === '-' ? (-1) * parseInt(arr[8] + arr[9]) : parseInt(arr[8] + arr[9])
        // this.agent.role.ballReq = { x: xPlayer, y: yPlayer, playerId: playerId }
        // }
        break
      case Messages.go:
        // this.agent.role.motion = true
        break
      // }
    }
  }
}

module.exports = SoundManager