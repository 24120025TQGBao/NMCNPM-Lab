function listResult(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.data) ||
      !Number.isSafeInteger(Number(value.total)) || Number(value.total) < 0) {
    throw new Error('Unexpected catalog search result');
  }
  return { data: value.data, total: Number(value.total) };
}

function detailResult(value) {
  if (value !== null && (typeof value !== 'object' || Array.isArray(value))) {
    throw new Error('Unexpected catalog detail result');
  }
  return value;
}

export function createDishesService(client) {
  async function call(name, params) {
    const { data, error } = await client.rpc(name, params);
    if (error) throw error;
    return data;
  }

  return {
    async getDishes({ search = null, page = 1, limit = 20, tags = [], category = null, flavor = null,
      maxCookTime = null, ingredients = [] }) {
      const filters = tags.length > 0 || category !== null || flavor !== null ||
        maxCookTime !== null || ingredients.length > 0;
      const name = filters ? 'search_catalog_dishes' : 'search_public_dishes';
      const params = filters ? {
        ...(category === null ? {} : { p_category: category }),
        p_search: search,
        p_tag_codes: tags,
        p_flavor: flavor,
        p_max_cook_time: maxCookTime,
        p_ingredient_ids: ingredients,
        p_page: page,
        p_limit: limit
      } : { p_search: search, p_page: page, p_limit: limit };
      return listResult(await call(name, params));
    },

    async getCategories() {
      const { data, error } = await client.from('thuoc_tinh_mon').select('nhom_tt, gia_tri');
      if (error) throw error;
      const normalize = value => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd').toUpperCase().replace(/ /g, '_');
      const categories = new Map();
      for (const row of data ?? []) {
        if (typeof row.nhom_tt !== 'string' || typeof row.gia_tri !== 'string') continue;
        if (!['LOAI_MON', 'LOAI', 'CATEGORY', 'TYPE'].includes(normalize(row.nhom_tt))) continue;
        const code = normalize(row.gia_tri);
        if (code && /^[A-Z0-9_]{1,100}$/.test(code)) categories.set(code, { code, name: row.gia_tri.trim() });
      }
      return [...categories.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    },

    async getDishById(id) {
      return detailResult(await call('get_catalog_dish', { p_id: id }));
    },

    async getRecipeById(id) {
      return detailResult(await call('get_catalog_recipe', { p_id: id }));
    }
  };
}
