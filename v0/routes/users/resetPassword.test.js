const test = require('ava')
const request = require('supertest')
require('../../../setupTests.js')(test)

const app = require('../../../index.js')
const { User } = require('../../../database/models')
const { NotFoundError, UnauthorizedError } = require('../../errors')
const { signJwt } = require('../../utils')
const scopes = require('../../scopes')
const { shouldNotAcceptInvalidToken } = require('./testUtils')

const resetPasswordEndpoint = '/v0/users/:id/resetPassword'

async function makeRequest(token, id, attrs) {
	const req = request(app).post(resetPasswordEndpoint.replace(':id', id))
	if (token) {
		req.set('Authorization', `Bearer ${token}`)
	}
	return req.send(attrs)
}

test(
	`POST ${resetPasswordEndpoint} should not accept invalid auth token`,
	shouldNotAcceptInvalidToken(makeRequest)
)

test(`POST ${resetPasswordEndpoint} should reset password for user`, async t => {
	const user = await User.create({
		username: 'test',
		password: '123456',
		email: 'test@test.com',
		emailConfirmed: false
	})

	const token = await signJwt({ scopes: scopes.userResetPassword }, { subject: `${user.id}` })
	const attrs = { password: 'updated' }
	const { status, body } = await makeRequest(token, user.id, attrs)

	t.is(status, 200, body.message)
	t.truthy(body)
	t.true(typeof body.id === 'number')
	t.truthy(new Date(body.createdAt))
	t.truthy(new Date(body.updatedAt) > new Date(body.createdAt))
	t.is(body.username, user.username)
	t.is(body.email, user.email)
	t.is(body.emailConfirmed, user.emailConfirmed)
	// private fields, should never be returned by the endpoint
	t.false('password' in body)
	// verify password was hashed
	const updatedUser = await User.findOne({ id: body.id })
	const matches = await User.comparePassword(updatedUser, attrs.password)
	t.truthy(matches)
})

test(`POST ${resetPasswordEndpoint} should reset password for another user`, async t => {
	const user = await User.create({
		username: 'test',
		password: '123456',
		email: 'test@test.com',
		emailConfirmed: false
	})

	const otherUser = await User.create({
		username: 'test-other',
		password: '123456',
		email: 'test-other@test.com',
		emailConfirmed: false
	})

	const token = await signJwt({ scopes: scopes.user }, { subject: `${user.id}` })
	const { status, body } = await makeRequest(token, otherUser.id)

	t.is(status, UnauthorizedError.CODE, body.message)
	t.is(body.code, UnauthorizedError.CODE)
	t.truthy(body.message)
})

test(`POST ${resetPasswordEndpoint} should not update password for non-existent user`, async t => {
	const token = await signJwt({ scopes: scopes.userResetPassword }, { subject: '9999' })
	const { status, body } = await makeRequest(token, '9999')

	t.is(status, NotFoundError.CODE, body.message)
	t.is(body.code, NotFoundError.CODE)
	t.truthy(body.message)
})
