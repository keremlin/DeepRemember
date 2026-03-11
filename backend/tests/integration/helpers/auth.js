const request = require('supertest');
const app = require('../../../server');

const TEST_USER = { email: 'jest@deepremember.test', password: 'Test1234!' };

async function registerAndLogin() {
  await request(app).post('/api/auth/register').send(TEST_USER);
  const res = await request(app).post('/api/auth/login').send(TEST_USER);
  return res.body.token;
}

module.exports = { registerAndLogin, TEST_USER };
