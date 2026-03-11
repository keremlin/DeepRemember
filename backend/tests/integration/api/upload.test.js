// Integration tests for /upload-files
// Per audit-report.md [CRITICAL]: the upload endpoint is missing auth middleware.
// These tests assert the REQUIRED behaviour (401 without token).
// They fail against the unpatched code and must pass after the fix.

const request = require('supertest');
const app = require('../../../server');

describe('Upload route — auth guard', () => {

  test('POST /upload-files returns 401 without token', async () => {
    const res = await request(app)
      .post('/upload-files')
      .field('generateSubtitle', 'false');
    expect(res.status).toBe(401);
  });

  test('POST /upload-files returns 401 with invalid token', async () => {
    const res = await request(app)
      .post('/upload-files')
      .set('Authorization', 'Bearer invalid.token.here')
      .field('generateSubtitle', 'false');
    expect(res.status).toBe(401);
  });

});
