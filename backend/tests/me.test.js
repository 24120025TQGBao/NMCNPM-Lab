import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import * as supabaseLib from '../src/lib/supabase.js';

const USER_ID = '44444444-4444-4444-4444-444444444444';
const PROFILE = {
  ma_nd: USER_ID,
  ten_hien_thi: 'Minh',
  anh_dai_dien: null,
  vai_tro: 'USER',
  trang_thai: 'ACTIVE'
};

function createProfileClient(result) {
  const query = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.maybeSingle = vi.fn().mockResolvedValue(result);

  return {
    client: { from: vi.fn(() => query) },
    query
  };
}

function mockAuth(user = { id: USER_ID }) {
  return vi.spyOn(supabaseLib, 'getAnonClient').mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null })
    }
  });
}

describe('GET /api/me', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('requires a valid bearer token and does not query the profile without one', async () => {
    const { client } = createProfileClient({ data: PROFILE, error: null });
    const app = createApp({ profileClient: client });

    const response = await request(app).get('/api/me');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(client.from).not.toHaveBeenCalled();
  });

  it('returns only the authenticated user profile in the shape used by FE auth', async () => {
    mockAuth();
    const { client, query } = createProfileClient({ data: PROFILE, error: null });
    const app = createApp({ profileClient: client });

    const response = await request(app)
      .get('/api/me')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(PROFILE);
    expect(JSON.stringify(response.body)).not.toContain('email');
    expect(client.from).toHaveBeenCalledWith('nguoi_dung');
    expect(query.select).toHaveBeenCalledWith(
      'ma_nd, ten_hien_thi, anh_dai_dien, vai_tro, trang_thai'
    );
    expect(query.eq).toHaveBeenCalledWith('ma_nd', USER_ID);
  });

  it('returns 409 when the authenticated user has no profile row', async () => {
    mockAuth();
    const { client } = createProfileClient({ data: null, error: null });
    const app = createApp({ profileClient: client });

    const response = await request(app)
      .get('/api/me')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('PROFILE_NOT_FOUND');
  });

  it('QĐ 5.3: ignores a different user ID supplied in query parameters', async () => {
    mockAuth();
    const { client, query } = createProfileClient({ data: PROFILE, error: null });
    const response = await request(createApp({ profileClient: client }))
      .get('/api/me?user_id=another-user&ma_nd=another-user')
      .set('Authorization', 'Bearer valid-token');
    expect(response.status).toBe(200);
    expect(response.body.ma_nd).toBe(USER_ID);
    expect(query.eq.mock.calls).toEqual([['ma_nd', USER_ID]]);
  });

  it.each(['Basic credentials', 'Bearer', 'Bearer invalid-token'])('rejects invalid authorization %s without reading private profiles', async authorization => {
    vi.spyOn(supabaseLib, 'getAnonClient').mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'expired' } }) }
    });
    const { client } = createProfileClient({ data: PROFILE, error: null });
    const response = await request(createApp({ profileClient: client }))
      .get('/api/me').set('Authorization', authorization);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(client.from).not.toHaveBeenCalled();
  });

  it('returns 403 for a locked profile', async () => {
    mockAuth();
    const { client } = createProfileClient({
      data: { ...PROFILE, trang_thai: 'LOCKED' },
      error: null
    });
    const app = createApp({ profileClient: client });

    const response = await request(app)
      .get('/api/me')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('does not expose profile database errors', async () => {
    mockAuth();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client } = createProfileClient({
      data: null,
      error: new Error('sensitive database detail')
    });
    const app = createApp({ profileClient: client });

    const response = await request(app)
      .get('/api/me')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(response.body)).not.toContain('sensitive database detail');
  });
});
