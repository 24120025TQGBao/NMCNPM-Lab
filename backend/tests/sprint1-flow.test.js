import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import * as supabaseLib from '../src/lib/supabase.js';

const USER_ID = '44444444-4444-4444-4444-444444444444';
const ACCESS_TOKEN = 'valid-test-token';
const PROFILE = {
  ma_nd: USER_ID,
  ten_hien_thi: 'QA Tester',
  anh_dai_dien: null,
  vai_tro: 'USER',
  trang_thai: 'ACTIVE'
};

const POST_BODY = {
  dish_id: 17,
  title: 'QA E2E recipe',
  content: 'Recipe created through the API flow.',
  ingredients: [
    { name: 'QA E2E ingredient', quantity: 250, unit: 'g', role: 'PRIMARY' }
  ],
  steps: [
    { content: 'Prepare the ingredient.' },
    { content: 'Cook and serve.' }
  ]
};

function createProfileClient() {
  const query = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.maybeSingle = vi.fn().mockResolvedValue({ data: PROFILE, error: null });
  return { from: vi.fn(() => query) };
}

describe('Sprint 1 backend API flow with mocked Supabase', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads profile and dishes, creates a post, then reads it from feed and detail', async () => {
    const posts = [];
    const createdPost = {
      id: 51,
      title: POST_BODY.title,
      content: POST_BODY.content,
      created_at: '2026-11-13T00:00:00.000Z',
      dish: { id: POST_BODY.dish_id, name: 'Phở bò' },
      author: { id: USER_ID, display_name: PROFILE.ten_hien_thi },
      ingredients: [
        {
          ingredient_id: 100,
          name: POST_BODY.ingredients[0].name,
          quantity: POST_BODY.ingredients[0].quantity,
          unit: POST_BODY.ingredients[0].unit,
          role: POST_BODY.ingredients[0].role
        }
      ],
      steps: POST_BODY.steps.map((step, index) => ({
        order: index + 1,
        content: step.content
      }))
    };
    const anonClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null
        })
      },
      rpc: vi.fn(async (name, args) => {
        if (name === 'get_public_posts') {
          return {
            data: {
              data: posts.map(({ id, title, created_at, dish, author }) => ({
                id,
                title,
                created_at,
                dish,
                author
              })),
              total: posts.length
            },
            error: null
          };
        }

        if (name === 'get_public_post') {
          return {
            data: posts.find(post => post.id === args.p_id) ?? null,
            error: null
          };
        }

        throw new Error(`Unexpected anonymous RPC: ${name}`);
      })
    };

    vi.spyOn(supabaseLib, 'getAnonClient').mockReturnValue(anonClient);
    const createUserClient = vi.spyOn(supabaseLib, 'createUserClient').mockReturnValue({
      rpc: vi.fn(async (name, args) => {
        expect(name).toBe('create_post_with_recipe');
        expect(args.p_dish_id).toBe(POST_BODY.dish_id);
        const post = { ...createdPost, title: args.p_title, content: args.p_content };
        posts.unshift(post);
        return { data: post, error: null };
      })
    });
    const dishesClient = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          data: [{ id: 17, name: 'Phở bò', description: null, image_url: null }],
          total: 1
        },
        error: null
      })
    };
    const app = createApp({
      dishesClient,
      profileClient: createProfileClient()
    });
    const auth = { Authorization: `Bearer ${ACCESS_TOKEN}` };

    const meResponse = await request(app).get('/api/me').set(auth);
    expect(meResponse.status).toBe(200);
    expect(meResponse.body).toEqual(PROFILE);

    const dishesResponse = await request(app)
      .get('/api/dishes?search=pho&page=1&limit=5');
    expect(dishesResponse.status).toBe(200);
    expect(dishesResponse.body.data[0].name).toBe('Phở bò');

    const createResponse = await request(app)
      .post('/api/posts')
      .set(auth)
      .send(POST_BODY);
    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.author.id).toBe(USER_ID);
    expect(createResponse.body.data.steps.map(step => step.order)).toEqual([1, 2]);
    expect(createUserClient).toHaveBeenCalledWith(ACCESS_TOKEN);

    const feedResponse = await request(app).get('/api/posts?page=1&limit=5');
    expect(feedResponse.status).toBe(200);
    expect(feedResponse.body.data[0].id).toBe(createdPost.id);
    expect(feedResponse.body.meta.total).toBe(1);

    const detailResponse = await request(app).get(`/api/posts/${createdPost.id}`);
    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data.ingredients).toHaveLength(1);
    expect(detailResponse.body.data.steps).toHaveLength(2);
  });
});
