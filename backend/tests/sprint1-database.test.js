import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';

// Execute the repository SQL, not an imitation RPC. The schema/auth context is a
// local fixture; these tests do not certify a deployed Supabase schema or RLS.
const USER = '11111111-1111-4111-8111-111111111111';
const LOCKED = '22222222-2222-4222-8222-222222222222';
let db;
const tables = ['bai_dang', 'cong_thuc', 'nguyen_lieu', 'ct_nguyen_lieu', 'buoc_cong_thuc'];

async function identity(role, id = '') {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec(`set role ${role}`);
}

async function create(overrides = {}) {
  const args = {
    dish: 17, title: 'QA recipe', content: null,
    ingredients: [{ name: 'Salt', quantity: null, unit: null, role: 'PRIMARY' }, { name: 'Water', quantity: 100, unit: 'ml' }],
    steps: [{ content: 'Prepare' }, { content: 'Cook' }], ...overrides,
  };
  const result = await db.query(
    'select public.create_post_with_recipe($1, $2, $3, $4::jsonb, $5::jsonb) as post',
    [args.dish, args.title, args.content, JSON.stringify(args.ingredients), JSON.stringify(args.steps)],
  );
  return result.rows[0].post;
}

async function publicFeed(page = 1, limit = 20) {
  const { rows } = await db.query('select public.get_public_posts($1, $2) as feed', [page, limit]);
  return rows[0].feed;
}

async function detail(id) {
  const { rows } = await db.query('select public.get_public_post($1) as post', [id]);
  return rows[0].post;
}

async function counts() {
  await db.exec('reset role');
  const values = [];
  for (const table of tables) values.push(Number((await db.query(`select count(*) as n from ${table}`)).rows[0].n));
  return values;
}

beforeAll(async () => {
  db = await PGlite.create();
  await db.exec(await readFile(new URL('./fixtures/sprint1-schema.sql', import.meta.url), 'utf8'));
  for (const file of ['create_post_with_recipe.sql', 'get_public_posts.sql']) {
    await db.exec(await readFile(new URL(`../../supabase/${file}`, import.meta.url), 'utf8'));
  }
}, 30000);

afterAll(async () => { await db?.close(); });

beforeEach(async () => {
  await db.exec(`reset role;
    truncate bai_dang, buoc_cong_thuc, ct_nguyen_lieu, nguyen_lieu, cong_thuc, mon_an, nguoi_dung restart identity cascade;
    insert into nguoi_dung (ma_nd, ten_hien_thi, email, trang_thai) values
      ('${USER}', 'QA member', 'private@example.test', 'ACTIVE'),
      ('${LOCKED}', 'Locked member', 'locked@example.test', 'LOCKED');
    insert into mon_an values (17, 'Phở bò', 'ACTIVE'), (18, 'Hidden dish', 'HIDDEN');`);
  await identity('authenticated', USER);
});

describe('Sprint 1 proposal rules against PostgreSQL RPCs', () => {
  it('QĐ 3.2/5.2: anon cannot execute recipe creation even with a forged subject', async () => {
    await identity('anon', USER);
    await expect(create()).rejects.toMatchObject({ code: '42501' });
    expect(await counts()).toEqual([0, 0, 0, 0, 0]);
  });

  it('QĐ 3.2: authenticated role without a JWT subject cannot create a recipe', async () => {
    await identity('authenticated');
    await expect(create()).rejects.toThrow('ERR_UNAUTHORIZED');
    expect(await counts()).toEqual([0, 0, 0, 0, 0]);
  });

  it('QĐ 5.6: a locked account cannot create data even with a valid subject', async () => {
    await identity('authenticated', LOCKED);
    await expect(create()).rejects.toThrow('ERR_FORBIDDEN');
    expect(await counts()).toEqual([0, 0, 0, 0, 0]);
  });

  it.each([18, 999999])('rejects an inactive or nonexistent dish (%s) without saving children', async dish => {
    await expect(create({ dish })).rejects.toThrow('ERR_DISH_NOT_FOUND');
    expect(await counts()).toEqual([0, 0, 0, 0, 0]);
  });

  it('QĐ 3.1/1.5: persists the recipe graph with JWT owner, ordered steps and to-taste quantities', async () => {
    const post = await create();
    expect(post.author).toEqual({ id: USER, display_name: 'QA member' });
    expect(post.dish).toEqual({ id: 17, name: 'Phở bò' });
    expect(post.content).toBe(post.title);
    expect(post.steps).toEqual([{ order: 1, content: 'Prepare' }, { order: 2, content: 'Cook' }]);
    expect(post.ingredients).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Salt', quantity: null, unit: null }),
      expect.objectContaining({ name: 'Water', quantity: 100, unit: 'ml' }),
    ]));
    expect(await counts()).toEqual([1, 1, 2, 2, 2]);
    const { rows } = await db.query(`select b.ma_tac_gia, c.ma_nguoi_tao, c.ma_mon,
      (select count(*)::int from ct_nguyen_lieu i where i.ma_ct = c.ma_ct) as ingredients,
      (select count(*)::int from buoc_cong_thuc s where s.ma_ct = c.ma_ct) as steps
      from bai_dang b join cong_thuc c using (ma_ct) where b.ma_bai = $1`, [post.id]);
    expect(rows).toEqual([{ ma_tac_gia: USER, ma_nguoi_tao: USER, ma_mon: 17, ingredients: 2, steps: 2 }]);
  });

  it('QĐ 3.3/5.3: anon reads public detail without private profile fields or table access', async () => {
    const created = await create();
    await identity('anon');
    const post = await detail(created.id);
    expect(post.id).toBe(created.id);
    expect(post.author).toEqual({ id: USER, display_name: 'QA member' });
    expect(JSON.stringify(post)).not.toMatch(/email|vai_tro|trang_thai|private@example/);
    await expect(db.query('select * from nguoi_dung')).rejects.toMatchObject({ code: '42501' });
  });

  it.each(['HIDDEN', 'DELETED', 'DRAFT'])('QĐ 3.3: changing a public post to %s removes it from feed and detail', async status => {
    const post = await create();
    await identity('anon');
    expect((await publicFeed()).data.map(p => p.id)).toEqual([post.id]);
    await db.exec('reset role');
    await db.query('update bai_dang set trang_thai = $1 where ma_bai = $2', [status, post.id]);
    await identity('anon');
    expect(await publicFeed()).toEqual({ total: 0, data: [] });
    expect(await detail(post.id)).toBeNull();
  });

  it('public recipe feed excludes review posts and unknown detail returns null', async () => {
    const post = await create();
    await db.exec('reset role');
    await db.query("update bai_dang set loai_bai = 'REVIEW' where ma_bai = $1", [post.id]);
    await identity('anon');
    expect(await publicFeed()).toEqual({ total: 0, data: [] });
    expect(await detail(post.id)).toBeNull();
    expect(await detail(999999)).toBeNull();
  });

  it('public pagination uses newest first and ID as a stable tie-break without duplicate pages', async () => {
    const first = await create({ title: 'First recipe' });
    const second = await create({ title: 'Second recipe' });
    const third = await create({ title: 'Third recipe' });
    await db.exec("reset role; update bai_dang set tao_luc = '2026-11-15T00:00:00Z'");
    await db.query("update bai_dang set tao_luc = '2026-11-14T00:00:00Z' where ma_bai = $1", [third.id]);
    await identity('anon');
    const pages = await Promise.all([1, 2, 3, 4].map(page => publicFeed(page, 1)));
    expect(pages.map(p => p.total)).toEqual([3, 3, 3, 3]);
    expect(pages.flatMap(p => p.data.map(post => post.id))).toEqual([second.id, first.id, third.id]);
  });

  it('rolls back recipe, newly inserted ingredient and relations when a later ingredient is missing', async () => {
    await expect(create({ ingredients: [{ name: 'Rollback new ingredient' }, { ingredient_id: 999999 }] }))
      .rejects.toThrow('ERR_INGREDIENT_NOT_FOUND');
    expect(await counts()).toEqual([0, 0, 0, 0, 0]);
  });

  it('rolls back on late step constraint failure after valid ingredient inserts', async () => {
    await expect(create({ steps: [{ content: 'Valid first step' }, { content: '   ' }] }))
      .rejects.toMatchObject({ code: '23514' });
    expect(await counts()).toEqual([0, 0, 0, 0, 0]);
  });

  it('detects the same ingredient supplied by ID and case-insensitive name and preserves existing data', async () => {
    const existing = await create();
    const salt = existing.ingredients.find(i => i.name === 'Salt');
    const before = await counts();
    await identity('authenticated', USER);
    await expect(create({ ingredients: [{ name: 'Rollback new ingredient' }, { ingredient_id: salt.ingredient_id }, { name: 'SALT' }] }))
      .rejects.toThrow('ERR_INGREDIENT_DUPLICATE');
    expect(await counts()).toEqual(before);
    await identity('anon');
    expect(await detail(existing.id)).toEqual(existing);
  });
});
