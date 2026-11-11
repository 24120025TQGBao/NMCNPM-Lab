export function createDishesService(client) {
  return {
    async getDishes({ search, page, limit }) {
      let query = client
        .from('mon_an')
        .select(
          'ma_mon, ten_mon, mo_ta_ngan, hinh_anh',
          { count: 'exact' }
        )
        .eq('trang_thai', 'ACTIVE')

      if (search) {
        const escaped = search.replace(/[\\%_]/g, '\\$&')
        query = query.ilike('ten_mon', `%${escaped}%`)
      }

      const from = (page - 1) * limit
      const to = from + limit - 1

      const { data, error, count } = await query
        .order('ten_mon', { ascending: true })
        .range(from, to)

      if (error) throw error

      // Ánh xạ DB -> API Contract
      const dishes = (data ?? []).map(dish => ({
        id: dish.ma_mon,
        name: dish.ten_mon,
        description: dish.mo_ta_ngan,
        image_url: dish.hinh_anh
      }))

      return {
        data: dishes,
        meta: {
          page,
          limit,
          total: count ?? 0
        }
      }
    }
  }
}