class GoTo {
	constructor(target, isBall) {
		this.target = target
		this.name = "GOTO"
		this.isBall = isBall
	}
}

class ReachFollow {
	constructor(type, perm, team = null, id = null) {
		this.target = null
		this.team = team
		this.id = id
		if (perm)
			this.name = "FOLLOW"
		else
			this.name = "REACH"
		this.type = type
	}

	equals(element) {
		if (this.type !== element.type) {
			return false
		}
		switch (this.type) {
			case "ball":
				return true
			case "player":
				return this.team === element.team && this.id === element.number
		}
	}
}

module.exports = {
	GOTO: GoTo,
	REACHFOLLOW: ReachFollow
}