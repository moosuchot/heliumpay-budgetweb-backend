const utils = require('../../utils')
const runcli = require('../runCliCmd')

module.exports = function(app) {
	const commands = [
		'getblockchaininfo',
		'getblockcount',
		'getdifficulty',
		'getspentinfo',
	]

	commands.forEach(route => {
		app.get('/'+route, async (req, res) => {
			const data = await runcli(route)
			res.send(utils.formatResponse(data, req))
		})
	})
	
}