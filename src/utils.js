module.exports = {
	isNil,
	isDefined
}

function isNil(value) {
	return value === null || value === undefined
}

function isDefined(value) {
	return !isNil(value)
}
