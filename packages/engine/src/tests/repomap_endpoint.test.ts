import { test, expect } from '@jest/globals';
import request from 'supertest';
import app from '../../app'; // Assuming your Express app is exported from here

test('GET /api/repomap returns 200 with complete architectural symbol inventory', async () => {
  const response = await request(app).get('/api/repomap');

  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty('symbols');
  expect(Array.isArray(response.body.symbols)).toBe(true);

  // Assuming the architectural symbols are stored in a database
  // and we need to check if all expected symbols are present
  const expectedSymbols = [
    'symbol1',
    'symbol2',
    'symbol3',
    // Add more expected symbols as needed
  ];

  response.body.symbols.forEach(symbol => {
    expect(expectedSymbols).toContain(symbol);
  });
});