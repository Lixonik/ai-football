const Msg = require('./msg')
const { roundToHund, normalize, do180 } = require('./math_utils')
const { FLAGS } = require('./constants')
const Controller = require('./controller')
const { isNil, isDefined } = require("./utils")

const SoundManager = require('./soundManager')

const Memory = require('./memory')

const FHController = require("./Controllers/Forward/FHController")
const GHController = require('./Controllers/Goalie/GHController')

class Agent {
    constructor(teamName, role) {
        this.connected = false
        this.team = teamName
        this.side = 'l' // По умолчанию - правая половина поля
        this.run = false // Игра начата
        this.act = () => {} // Действия

        this.gamemode = 'before_kick_off'
        this.objects = null
        this.zeroVector = null
        this.id = 0

        this.x = null
        this.y = null
        this.controller = new Controller(this)
        this.soundManager = new SoundManager(this)
        this.memory = new Memory(this)
        this.goalie = role === "goalie"
        if (this.goalie)
            this.player_controller = new GHController(this)
        else
            this.player_controller = new FHController(this)

        this.onConnection = () => {
        }
    }

    msgGot(msg) { // Получение сообщения
        if (!this.connected) {
            this.connected = true
            this.onConnection()
        }
        let data = msg.toString('utf8') // Приведение к строке
        this.processMsg(data) // Разбор сообщения
    }

    setSocket(socket) { // Настройка сокета
        this.socket = socket
    }

    socketSend(cmd, value) { // Отправка команды
        this.socket.sendMsg(`(${cmd} ${value})`)
    }

    processMsg(msg) { // Обработка сообщения
        let data = Msg.parseMsg(msg) // Разбор сообщения
        if (!data) throw new Error('Parse error\n' + msg)
        // Первое (hear) - начало игры
        if (data.cmd === 'hear') {
            this.soundManager.scan(data.p)
        }
        if (data.cmd === 'init') this.initAgent(data.p)//Инициализация
        this.analyzeEnv(data.msg, data.cmd, data.p) // Обработка
        if (data.cmd === "see") {
            this.sendCmd() // Отправка команды
        }
    }

    initAgent(p) {
        if (p[0] === 'r') this.side = 'r' // Правая половина поля
        if (p[0] === 'l') this.side = 'l'    // Левая половина поля
        if (p[1]) this.id = p[1] // id игрока
    }

    analyzeEnv(msg, cmd, p) { // Анализ сообщения
        {
            if (cmd !== 'see') return

            p.forEach(item => {
                if (typeof (item) == 'object') this.parseObjInfo(item)
            })

            this.processObjs(p)
            this.objects = p
        }
    }

    parseObjInfo(objInfo) {

        let cmd = objInfo.cmd

        let tmpFlagType = cmd.p.join('')
        objInfo.x = FLAGS[tmpFlagType] ? FLAGS[tmpFlagType].x : null
        objInfo.y = FLAGS[tmpFlagType] ? FLAGS[tmpFlagType].y : null

        //Type detect
        if (objInfo.x) objInfo.type = 'flag'
        if (tmpFlagType === 'b') objInfo.type = 'ball'
        if (cmd.p[0] === 'p') {
            if (cmd.p.length > 1) {
                objInfo.team = cmd.p[1].replace(/"/g, '')
                objInfo.type = "player"
                objInfo.ally = objInfo.team === this.team
            }
            if (cmd.p.length > 2) objInfo.number = parseInt(cmd.p[2])
            objInfo.goalie = cmd.p.length > 3
        }

        //Parse Info
        let p = objInfo.p

        objInfo.direction = p.length > 1 ? p[1] : p[0]
        objInfo.distance = p.length >= 2 ? p[0] : null
        objInfo.distanceChange = p.length >= 4 ? p[2] : null
        objInfo.directionChange = p.length >= 4 ? p[3] : null
        objInfo.bodyFacingDirection = p.length >= 6 ? p[4] : null
        objInfo.headFacingDirection = p.length >= 6 ? p[5] : null
    }

    processObjs(objects) {
        let flags = objects
            .filter(obj => obj.x)
            .sort((a, b) => a.distance - b.distance)

        let minError = null
        let bestLocation = null

        /**
         * Find agent location
         */
        let i = 0
        while (true) {
            let cFlags = flags.slice(i, flags.length)
            let location = this.localizeAgent(cFlags)
            if (isNil(location)) break

            let error = 0
            for (let flag of flags) {
                let estimated = FLAGS.distance(location, { x: flag.x, y: flag.y })
                error = Math.max(Math.abs(estimated - flag.distance), error)
            }

            if (!minError || minError > error) {
                minError = error
                bestLocation = location
            }
            i++
        }
        this.x = bestLocation ? roundToHund(bestLocation.x) : null
        this.y = bestLocation ? roundToHund(bestLocation.y) : null

        /**
         * Find object location
         */
        if (!this.x) {
            return null
        }
        minError = null
        for (let flag of flags) {
            let zeroVec = this.rotate(normalize(this, flag), flag.direction)
            let error = 0

            flags.forEach(f => {
                let fVec = normalize(this, f)
                let estimated = Math.acos(zeroVec.x * fVec.x + zeroVec.y * fVec.y)
                error = Math.max(Math.abs(estimated - flag.direction * Math.PI / 180), error)
            })

            if (!minError || minError > error) {
                minError = error
                this.zeroVector = zeroVec
            }
        }

        //Set obj data
        for (let obj of objects) {
            if (typeof (obj) != 'object') {
                continue
            }
            let vec = this.rotate(this.zeroVector, -obj.direction)
            obj.x = roundToHund(this.x + vec.x * obj.distance)
            obj.y = -roundToHund(this.y + vec.y * obj.distance)
        }
        this.y *= -1
    }

    rotate(v, objDir) {
        let angle = objDir * (Math.PI / 180)
        return {
            x: v.x * Math.cos(angle) - v.y * Math.sin(angle),
            y: v.x * Math.sin(angle) + v.y * Math.cos(angle),
        }
    }

    localizeAgent(flags) {
        if (flags.length < 2) return null

        let [f1, f2] = flags

        let d = FLAGS.distance({ x: f1.x, y: f1.y }, { x: f2.x, y: f2.y })
        let alpha = (f1.direction - f2.direction) / 180 * Math.PI

        if (!f1.distance || !f2.distance) return null
        let d1 = f1.distance, d2 = f2.distance

        if (alpha < 0) {
            [f1, f2] = [f2, f1];
            [d1, d2] = [d2, d1]
        }
        let xt = f2.x - f1.x, yt = f2.y - f1.y
        let len = Math.sqrt(xt ** 2 + yt ** 2)
        xt = xt / len
        yt = yt / len
        let cos_b = Math.min(1, Math.max(-1, (d ** 2 + d1 ** 2 - d2 ** 2) / (2 * d * d1)))
        let sin_b = Math.sqrt(Math.abs(1 - cos_b ** 2))

        const location = {
            x: f1.x + (xt * cos_b - yt * sin_b) * d1,
            y: f1.y + (xt * sin_b + yt * cos_b) * d1,
        }

        return location
    }

    sendCmd() {
        if (!this.run) { // Игра не начата
            if (isNil(this.marker) && this.side === "r") {
                this.act = this.controller.turn(180)
                this.act()
                this.marker = true
            }
            return
        }
        this.memory.analyze()
        this.act = this.player_controller.getAction()
        this.act()
    }
}

module.exports = Agent // Экспорт игрока
