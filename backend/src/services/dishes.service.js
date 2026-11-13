export function createDishesService(client) {
  return {
    async getDishes({ search, page, limit }) {
      const { data, error } = await client.rpc('search_public_dishes', {
        p_search: search,
        p_page: page,
        p_limit: limit
      })

      if (error) throw error
      if (!data || !Array.isArray(data.data) || !Number.isInteger(data.total) || data.total < 0) {
        throw new Error('Supabase returned an invalid dishes search result.')
      }

      return data
    }
  }
}
