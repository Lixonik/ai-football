const { Command } = require("commander")
const Agent = require("./agent")
const readline = require("readline")

const program = new Command()

program
	//.option("-p, --params <params...>", "Agent params [x, y]: number[]")
	.option("-x, --x <x>", "x: number")
	.option("-y, --y <y>", "y: number")
	.option("-t, --team <team>", "Team name: string")
	.option("-r, --role <role>", "Player role")
	.parse()

const VERSION = 7
const OURTEAM = "IBAPRO"

let teamName = program.opts().team ?? OURTEAM
let role = program.opts().role ?? ""
let agent = new Agent(teamName, role)
require("./socket")(agent, teamName, VERSION, role === "goalie" ? "(goalie)" : "")
const [x, y] = [program.opts().x, program.opts().y]

/**
 * callback on socket setup
 */
agent.onConnection = () => {
	agent.socketSend("move", `${x} ${y}`)
}
