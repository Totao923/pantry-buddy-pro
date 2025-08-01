import { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../pages/api/health';
import { createMocks } from 'node-mocks-http';

// Mock Supabase client to prevent import errors
jest.mock('../../lib/supabase/client', () => ({
  createSupabaseClient: jest.fn(() => null),
  createSupabaseServiceClient: jest.fn(() => null),
}));

describe('/api/health', () => {
  it('returns health status for GET request', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);

    const data = JSON.parse(res._getData());
    expect(data).toMatchObject({
      status: 'ok',
      timestamp: expect.any(String),
      version: '1.0.0',
      services: expect.objectContaining({
        database: expect.any(String),
        ai: expect.any(String),
      }),
    });

    // Verify timestamp is valid ISO string
    expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
  });

  it('returns 405 for non-GET requests', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);

    const data = JSON.parse(res._getData());
    expect(data).toEqual({
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED',
    });
  });

  it('includes database status when available', async () => {
    // Mock environment variables for database
    const originalEnv = process.env;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);

    const data = JSON.parse(res._getData());
    expect(data.services.database).toBeDefined();

    // Restore environment
    process.env = originalEnv;
  });

  it('includes AI service status when available', async () => {
    // Mock environment variables for AI
    const originalEnv = process.env;
    process.env.ANTHROPIC_API_KEY = 'test-key';

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);

    const data = JSON.parse(res._getData());
    expect(data.services.ai).toBeDefined();

    // Restore environment
    process.env = originalEnv;
  });
});
