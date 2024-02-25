const { Command } = require('commander')
const Agent = require('./agent')
const readline = require('readline')

const program = new Command()

program
    .option('-p, --params <params...>', 'Agent params [x, y]: number[]')
    .option('-t, --team <team>', 'Team name: string')
    .parse()

const VERSION = 7
const OURTEAM = 'IBAPRO'

let teamName = program.opts().team ?? OURTEAM
let agent = new Agent(teamName)
require('./socket')(agent, teamName, VERSION)
const [x, y, turn] = program.opts().params

let rl = readline.createInterface({ // Чтение консоли
    input: process.stdin,
    output: process.stdout,
})

rl.on('line', (input) => {
    agent.controls.parseRefereeCmd(input);
})

/**
 * callback on socket setup
 */
agent.onConnection = () => {
    agent.turn_value = turn
    agent.socketSend('move', `${x} ${y}`)
}
