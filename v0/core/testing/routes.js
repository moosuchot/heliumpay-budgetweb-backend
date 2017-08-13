const utils = require('../../utils')
const runcli = require('../runCliCmd')

module.exports = function(app) {

	app.get('/', async (req, res) => {
		const data = await runcli('getinfo')
		res.send(utils.formatResponse(data, req))
	})

}

