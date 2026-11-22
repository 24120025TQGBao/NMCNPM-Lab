import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

// Bảng `tag` và `mon_an_tag` trên Supabase hiện còn trống (22/11/2026), nên test dùng client giả
// có lọc eq/in thật trên dữ liệu mẫu và chỉ trả đúng các cột được select.
function createFakeClient(tables, { failTable } = {}) {
  const requested = [];
  const queries = [];

  const client = {
    from: vi.fn(table => {
      const filters = [];
      const recorded = { table, filters: [] };
      queries.push(recorded);
      let columns = null;
      const builder = {
        select(cols) {
          columns = cols.split(',').map(col => col.trim());
          return builder;
        },
        eq(column, value) {
          recorded.filters.push({ op: 'eq', column, value });
          filters.push(row => row[column] === value);
          return builder;
        },
        in(column, values) {
          recorded.filters.push({ op: 'in', column, value: values });
          filters.push(row => values.includes(row[column]));
          return builder;
        },
        then(resolve, reject) {
          requested.push(table);
          if (table === failTable) {
            return Promise.resolve({
              data: null,
              error: { message: `permission denied for table ${table}`, code: '42501' }
            }).then(resolve, reject);
          }
          const rows = (tables[table] ?? [])
            .filter(row => filters.every(filter => filter(row)))
            .map(row => Object.fromEntries(columns.map(col => [col, row[col]])));
          return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
        }
      };
      return builder;
    })
  };

  return { client, requested, queries };
}

function dish(id, extra = {}) {
  return {
    ma_mon: id,
    ten_mon: `Món ${id}`,
    mo_ta_ngan: `Mô tả ${id}`,
    hinh_anh: `https://img.example/${id}.jpg`,
    trang_thai: 'ACTIVE',
    vung_mien: null,
    ...extra
  };
}

const TABLES = {
  mon_an: [
    dish(3, { vung_mien: 'NAM' }),
    dish(1, { vung_mien: 'BAC' }),
    dish(2),
    dish(4, { trang_thai: 'HIDDEN' }),
    dish(5, { trang_thai: 'DELETED' }),
    dish(6, { vung_mien: 'NAM' }),
    // ACTIVE nhưng không đủ điều kiện gợi ý (thiếu ảnh hoặc mô tả): phải bị loại ở mọi truy vấn
    dish(7, { hinh_anh: null }),
    dish(8, { mo_ta_ngan: '   ' }),
    dish(9, { hinh_anh: '' }),
    dish(10, { mo_ta_ngan: null, vung_mien: 'NAM' })
  ],
  tag: [
    { ma_tag: 10, slug: 'troi-mua', ten_tag: 'Trời mưa' },
    { ma_tag: 11, slug: 'luoi-nau', ten_tag: 'Lười nấu' },
    { ma_tag: 12, slug: 'an-nhe', ten_tag: 'Ăn nhẹ' },
    { ma_tag: 13, slug: 'nau-cho-4', ten_tag: 'Nấu cho 4 người' },
    { ma_tag: 14, slug: 'bua-sang', ten_tag: 'Bữa sáng' }
  ],
  mon_an_tag: [
    { ma_mon: 1, ma_tag: 10 },
    { ma_mon: 1, ma_tag: 11 },
    { ma_mon: 2, ma_tag: 10 },
    { ma_mon: 3, ma_tag: 10 },
    { ma_mon: 3, ma_tag: 11 },
    { ma_mon: 3, ma_tag: 12 },
    { ma_mon: 4, ma_tag: 10 },
    { ma_mon: 4, ma_tag: 11 },
    { ma_mon: 6, ma_tag: 12 },
    { ma_mon: 1, ma_tag: 14 },
    { ma_mon: 2, ma_tag: 13 },
    // Món không đủ điều kiện gợi ý nhưng có đủ tag: vẫn phải bị loại
    { ma_mon: 7, ma_tag: 10 },
    { ma_mon: 7, ma_tag: 11 },
    { ma_mon: 8, ma_tag: 10 },
    { ma_mon: 8, ma_tag: 11 },
    { ma_mon: 9, ma_tag: 10 },
    { ma_mon: 10, ma_tag: 12 }
  ],
  cong_thuc: [
    { ma_ct: 1, ma_mon: 1, thoi_gian_phut: 45, trang_thai: 'ACTIVE' },
    { ma_ct: 2, ma_mon: 1, thoi_gian_phut: 30, trang_thai: 'ACTIVE' },
    { ma_ct: 3, ma_mon: 1, thoi_gian_phut: 5, trang_thai: 'HIDDEN' },
    { ma_ct: 4, ma_mon: 2, thoi_gian_phut: null, trang_thai: 'ACTIVE' },
    { ma_ct: 5, ma_mon: 3, thoi_gian_phut: 20, trang_thai: 'ACTIVE' }
  ]
};

function appWith(tables = TABLES, options) {
  const fake = createFakeClient(tables, options);
  return { ...fake, app: createApp({ suggestionsClient: fake.client }) };
}

const ids = response => response.body.data.map(item => item.id);

describe('GET /api/suggestions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('response shape', () => {
    it('is public, returns one dish by default in the { data } envelope without meta', async () => {
      const { app } = appWith();

      const response = await request(app).get('/api/suggestions');

      expect(response.status).toBe(200);
      expect(Object.keys(response.body)).toEqual(['data']);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toEqual({
        id: 1,
        name: 'Món 1',
        short_description: 'Mô tả 1',
        image_url: 'https://img.example/1.jpg',
        cook_time_minutes: 30,
        flavor: null,
        tags: ['BUA_SANG', 'LUOI_NAU', 'TROI_MUA'],
        region: 'BAC'
      });
    });

    it('ignores an Authorization header', async () => {
      const { app } = appWith();

      const response = await request(app).get('/api/suggestions').set('Authorization', 'Bearer not-a-real-token');

      expect(response.status).toBe(200);
    });

    it('returns flavor as null, tags as [] and cook time as null when the data is missing', async () => {
      const { app } = appWith();

      const response = await request(app).get('/api/suggestions?exclude=1,3,6&limit=10');

      expect(response.body.data).toEqual([
        {
          id: 2,
          name: 'Món 2',
          short_description: 'Mô tả 2',
          image_url: 'https://img.example/2.jpg',
          cook_time_minutes: null,
          flavor: null,
          tags: ['NAU_CHO_4', 'TROI_MUA'],
          region: null
        }
      ]);
    });

    it('uses the minimum time of ACTIVE recipes only as cook_time_minutes', async () => {
      const { app } = appWith();

      const response = await request(app).get('/api/suggestions?the=TROI_MUA&limit=10');

      const byId = Object.fromEntries(response.body.data.map(item => [item.id, item.cook_time_minutes]));
      expect(byId[1]).toBe(30); // 45, 30 (ACTIVE) và 5 (HIDDEN, bị bỏ qua)
      expect(byId[3]).toBe(20);
      expect(byId[2]).toBeNull();
    });
  });

  describe('active dishes only', () => {
    it('never returns HIDDEN or DELETED dishes, even with a large limit and chips that tag them', async () => {
      const { app } = appWith();

      const all = await request(app).get('/api/suggestions?limit=10');
      const tagged = await request(app).get('/api/suggestions?the=TROI_MUA,LUOI_NAU&limit=10');

      expect(ids(all)).toEqual([1, 2, 3, 6]);
      expect(ids(tagged)).toEqual([1, 3]);
    });
  });

  describe('exclude (QĐ 1.1)', () => {
    it('never returns an id listed in exclude', async () => {
      const { app } = appWith();

      const response = await request(app).get('/api/suggestions?exclude=1,2&limit=10');

      expect(ids(response)).toEqual([3, 6]);
    });

    it('moves on to the next dish when the first one is excluded', async () => {
      const { app } = appWith();

      const response = await request(app).get('/api/suggestions?exclude=1');

      expect(ids(response)).toEqual([2]);
    });

    it('treats an empty exclude as absent', async () => {
      const { app } = appWith();

      const response = await request(app).get('/api/suggestions?exclude=');

      expect(response.status).toBe(200);
      expect(ids(response)).toEqual([1]);
    });

    it('ignores excluded ids that do not exist and accepts duplicates', async () => {
      const { app } = appWith();

      const response = await request(app).get('/api/suggestions?exclude=999,1,1');

      expect(response.status).toBe(200);
      expect(ids(response)).toEqual([2]);
    });
  });

  describe('chips (AND, QĐ 1.2)', () => {
    it('returns only dishes that have every selected tag', async () => {
      const { app } = appWith();

      const one = await request(app).get('/api/suggestions?the=TROI_MUA&limit=10');
      const two = await request(app).get('/api/suggestions?the=TROI_MUA,LUOI_NAU&limit=10');
      const three = await request(app).get('/api/suggestions?the=TROI_MUA,LUOI_NAU,AN_NHE&limit=10');

      expect(ids(one)).toEqual([1, 2, 3]);
      expect(ids(two)).toEqual([1, 3]);
      expect(ids(three)).toEqual([3]);
    });

    it('does not depend on the order of the chips and accepts duplicates', async () => {
      const { app } = appWith();

      const response = await request(app).get('/api/suggestions?the=LUOI_NAU,TROI_MUA,LUOI_NAU&limit=10');

      expect(ids(response)).toEqual([1, 3]);
    });

    it('returns [] without relaxing the filter when no dish has all the tags', async () => {
      const { app } = appWith();

      const response = await request(app).get('/api/suggestions?the=LUOI_NAU,AN_NHE,TROI_MUA&exclude=3&limit=10');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: [] });
    });

    it('returns [] when the tag table is empty (tags not loaded yet)', async () => {
      const { app } = appWith({ ...TABLES, tag: [], mon_an_tag: [] });

      const response = await request(app).get('/api/suggestions?the=TROI_MUA');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: [] });
    });

    it('returns [] when one of the chips has no row in the tag table', async () => {
      const { app } = appWith({ ...TABLES, tag: TABLES.tag.filter(row => row.slug !== 'an-nhe') });

      const response = await request(app).get('/api/suggestions?the=TROI_MUA,AN_NHE');

      expect(response.body).toEqual({ data: [] });
    });

    it('still works without chips when the tag tables are empty', async () => {
      const { app } = appWith({ ...TABLES, tag: [], mon_an_tag: [] });

      const response = await request(app).get('/api/suggestions');

      expect(ids(response)).toEqual([1]);
      expect(response.body.data[0].tags).toEqual([]);
    });
  });

  describe('tag code <-> slug mapping (Q15)', () => {
    it('looks tags up by kebab-case slug, never by the upper-case API code', async () => {
      const { app, queries } = appWith();

      await request(app).get('/api/suggestions?the=TROI_MUA,NAU_CHO_4,LUOI_NAU');

      const tagLookup = queries.find(query => query.table === 'tag');
      expect(tagLookup.filters).toEqual([
        { op: 'in', column: 'slug', value: ['troi-mua', 'nau-cho-4', 'luoi-nau'] }
      ]);
    });

    it('filters correctly with a chip whose slug contains digits', async () => {
      const { app } = appWith();

      const response = await request(app).get('/api/suggestions?the=NAU_CHO_4&limit=10');

      expect(ids(response)).toEqual([2]);
    });

    it('does not match tags stored with upper-case slugs (they would violate the DB CHECK)', async () => {
      const upperCaseTags = TABLES.tag.map(row => ({ ...row, slug: row.slug.toUpperCase().replaceAll('-', '_') }));
      const { app } = appWith({ ...TABLES, tag: upperCaseTags });

      const response = await request(app).get('/api/suggestions?the=TROI_MUA');

      expect(response.body).toEqual({ data: [] });
    });

    it('returns tags[] as upper-case API codes, including tags that are not chips', async () => {
      const { app } = appWith();

      const response = await request(app).get('/api/suggestions?exclude=2,3,6&limit=1');

      expect(response.body.data[0].tags).toEqual(['BUA_SANG', 'LUOI_NAU', 'TROI_MUA']);
      expect(response.body.data[0].tags.every(code => /^[A-Z0-9]+(_[A-Z0-9]+)*$/.test(code))).toBe(true);
    });

    it('uses the same code in tags[] that the client sends in the, so a round trip is consistent', async () => {
      const { app } = appWith();

      const first = await request(app).get('/api/suggestions?the=TROI_MUA,LUOI_NAU');
      // `tags[]` có thể chứa mã ngoài 5 chip (ví dụ BUA_SANG); chỉ chip mới gửi lại được qua `the`.
      const code = first.body.data[0].tags.find(tag => ['TROI_MUA', 'LUOI_NAU'].includes(tag));
      const second = await request(app).get(`/api/suggestions?the=${code}&limit=10`);

      expect(ids(second)).toContain(first.body.data[0].id);
    });
  });

  describe('eligible dishes only (Q16): non-blank image and description', () => {
    it('never returns an ACTIVE dish with a missing, empty or blank image or description', async () => {
      const { app } = appWith();

      const response = await request(app).get('/api/suggestions?limit=10');

      expect(ids(response)).toEqual([1, 2, 3, 6]);
      expect(response.body.data.every(item => item.image_url && item.short_description.trim())).toBe(true);
    });

    it('applies to chips: ineligible dishes with all the tags are not returned', async () => {
      const { app } = appWith();

      const response = await request(app).get('/api/suggestions?the=TROI_MUA,LUOI_NAU&limit=10');

      expect(ids(response)).toEqual([1, 3]);
    });

    it('applies to region and to random picks', async () => {
      const { app } = appWith();

      const region = await request(app).get('/api/suggestions?vung_mien=NAM&limit=10');
      expect(ids(region)).toEqual([3, 6]);

      for (let run = 0; run < 25; run += 1) {
        const response = await request(app).get('/api/suggestions?random=true&limit=10');
        expect(ids(response).every(id => [1, 2, 3, 6].includes(id))).toBe(true);
        expect(ids(response)).toHaveLength(4);
      }
    });

    it('returns [] when the only remaining dishes are ineligible', async () => {
      const { app } = appWith();

      const response = await request(app).get('/api/suggestions?exclude=1,2,3,6&limit=10');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: [] });
    });

    it('treats an image or description made only of whitespace or tabs as blank', async () => {
      const tables = {
        ...TABLES,
        mon_an: [dish(1, { hinh_anh: ' \t\n' }), dish(2, { mo_ta_ngan: '\n' }), dish(3)]
      };
      const { app } = appWith(tables);

      const response = await request(app).get('/api/suggestions?limit=10');

      expect(ids(response)).toEqual([3]);
    });
  });

  describe('exhausted list', () => {
    it('returns 200 and [] when every matching dish is excluded', async () => {
      const { app } = appWith();

      const response = await request(app).get('/api/suggestions?the=TROI_MUA,LUOI_NAU&exclude=1,3');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: [] });
    });

    it('returns 200 and [] when no ACTIVE dish exists', async () => {
      const { app } = appWith({ ...TABLES, mon_an: [] });

      const response = await request(app).get('/api/suggestions');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: [] });
    });
  });

  describe('region (P1)', () => {
    it('filters by vung_mien and combines it with chips', async () => {
      const { app } = appWith();

      const region = await request(app).get('/api/suggestions?vung_mien=NAM&limit=10');
      const combined = await request(app).get('/api/suggestions?vung_mien=NAM&the=AN_NHE&limit=10');

      expect(ids(region)).toEqual([3, 6]);
      expect(ids(combined)).toEqual([3, 6]);
      expect(region.body.data.every(item => item.region === 'NAM')).toBe(true);
    });

    it('does not match unclassified dishes (NULL) to any region', async () => {
      const { app } = appWith();

      const response = await request(app).get('/api/suggestions?vung_mien=TRUNG&limit=10');

      expect(response.body).toEqual({ data: [] });
    });
  });

  describe('limit and stable order', () => {
    it('returns up to limit dishes in ascending id order when random is off', async () => {
      const { app } = appWith();

      const two = await request(app).get('/api/suggestions?limit=2');
      const ten = await request(app).get('/api/suggestions?limit=10');

      expect(ids(two)).toEqual([1, 2]);
      expect(ids(ten)).toEqual([1, 2, 3, 6]);
    });

    it('returns the same dish for the same request every time', async () => {
      const { app } = appWith();

      const first = await request(app).get('/api/suggestions?the=TROI_MUA');
      const second = await request(app).get('/api/suggestions?the=TROI_MUA');

      expect(first.body).toEqual(second.body);
    });
  });

  describe('random', () => {
    it('shuffles in the backend: the order changes with the random source', async () => {
      const tables = { ...TABLES, mon_an: [dish(1), dish(2), dish(3), dish(4), dish(5)] };

      vi.spyOn(Math, 'random').mockReturnValue(0.999);
      const unshuffled = await request(appWith(tables).app).get('/api/suggestions?random=true&limit=5');
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const shuffled = await request(appWith(tables).app).get('/api/suggestions?random=true&limit=5');

      expect(ids(unshuffled)).toEqual([1, 2, 3, 4, 5]);
      expect(ids(shuffled)).toEqual([2, 3, 4, 5, 1]);
    });

    it('applies exclude, chips and region to the random pick', async () => {
      const { app } = appWith();

      for (let run = 0; run < 20; run += 1) {
        const response = await request(app).get('/api/suggestions?random=true&the=TROI_MUA&exclude=1&vung_mien=NAM');
        expect(ids(response)).toEqual([3]);
      }
    });

    it('never repeats a dish within a session that keeps sending the seen ids as exclude', async () => {
      const { app } = appWith();
      const seen = [];

      for (let step = 0; step < 4; step += 1) {
        const exclude = seen.length ? `&exclude=${seen.join(',')}` : '';
        const response = await request(app).get(`/api/suggestions?random=true${exclude}`);
        expect(response.body.data).toHaveLength(1);
        const [id] = ids(response);
        expect(seen).not.toContain(id);
        seen.push(id);
      }

      expect([...seen].sort()).toEqual([1, 2, 3, 6]);

      const exhausted = await request(app).get(`/api/suggestions?random=true&exclude=${seen.join(',')}`);
      expect(exhausted.body).toEqual({ data: [] });
    });

    it('returns distinct dishes when limit is greater than 1', async () => {
      const { app } = appWith();

      const response = await request(app).get('/api/suggestions?random=true&limit=4');

      expect(new Set(ids(response)).size).toBe(4);
      expect([...ids(response)].sort()).toEqual([1, 2, 3, 6]);
    });

    it('treats random=false like the default', async () => {
      const { app } = appWith();

      const response = await request(app).get('/api/suggestions?random=false&limit=2');

      expect(ids(response)).toEqual([1, 2]);
    });
  });

  describe('validation (400, never reaches the database)', () => {
    it.each([
      ['exclude has a non-numeric id', 'exclude=1,abc', 'exclude'],
      ['exclude has an empty item', 'exclude=1,,2', 'exclude'],
      ['exclude has spaces', 'exclude=1,%202', 'exclude'],
      ['exclude has a negative id', 'exclude=-1', 'exclude'],
      ['exclude has id 0', 'exclude=0', 'exclude'],
      ['exclude has more than 200 ids', `exclude=${Array.from({ length: 201 }, (_, i) => i + 1).join(',')}`, 'exclude'],
      ['exclude is repeated', 'exclude=1&exclude=2', 'exclude'],
      ['the has an unknown code', 'the=TROI_MUA,KHONG_CO', 'the'],
      ['the is lowercase', 'the=troi_mua', 'the'],
      ['the has an empty item', 'the=TROI_MUA,', 'the'],
      ['the is repeated', 'the=TROI_MUA&the=AN_NHE', 'the'],
      ['random is not a boolean', 'random=yes', 'random'],
      ['random is empty', 'random=', 'random'],
      ['limit is 0', 'limit=0', 'limit'],
      ['limit is above 10', 'limit=11', 'limit'],
      ['limit is negative', 'limit=-1', 'limit'],
      ['limit is not a number', 'limit=abc', 'limit'],
      ['limit is fractional', 'limit=1.5', 'limit'],
      ['vung_mien is unknown', 'vung_mien=MIEN_TAY', 'vung_mien'],
      ['vung_mien is lowercase', 'vung_mien=bac', 'vung_mien']
    ])('returns 400 when %s', async (_name, queryString, field) => {
      const { app, client } = appWith();

      const response = await request(app).get(`/api/suggestions?${queryString}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.map(detail => detail.field)).toContain(field);
      expect(client.from).not.toHaveBeenCalled();
    });

    it('accepts the boundary values limit=10, exclude of 200 ids and all five chips', async () => {
      const { app } = appWith();
      const exclude = Array.from({ length: 200 }, (_, i) => i + 100).join(',');

      const response = await request(app).get(
        `/api/suggestions?limit=10&exclude=${exclude}&the=TROI_MUA,LUOI_NAU,CUOI_THANG,NAU_CHO_4,AN_NHE`
      );

      expect(response.status).toBe(200);
    });
  });

  describe('database errors', () => {
    it.each(['mon_an', 'tag', 'mon_an_tag', 'cong_thuc'])(
      'returns 500 without leaking details when reading %s fails',
      async failTable => {
        const { app } = appWith(TABLES, { failTable });

        const response = await request(app).get('/api/suggestions?the=TROI_MUA');

        expect(response.status).toBe(500);
        expect(response.body.error.code).toBe('INTERNAL_ERROR');
        expect(JSON.stringify(response.body)).not.toMatch(/permission|denied|42501|mon_an|cong_thuc|tag/);
      }
    );

    it('does not leak details when a table read fails without chips', async () => {
      const { app } = appWith(TABLES, { failTable: 'cong_thuc' });

      const response = await request(app).get('/api/suggestions');

      expect(response.status).toBe(500);
      expect(JSON.stringify(response.body)).not.toMatch(/permission|42501|cong_thuc/);
    });
  });
});
