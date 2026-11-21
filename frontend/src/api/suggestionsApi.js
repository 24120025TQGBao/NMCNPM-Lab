import { get } from '../lib/api/client'
import { mapSuggestionList } from './adapters'
import { fetchMockSuggestions } from '../mocks/suggestions.mock'

// Bật mock khi VITE_USE_MOCK_API === 'true' hoặc mặc định bật nếu chưa cấu hình
const USE_MOCK = import.meta.env.VITE_USE_MOCK_API !== 'false'

export async function getSuggestions({ exclude, the, random, limit = 1, vung_mien, signal } = {}) {
  if (USE_MOCK) {
    const raw = await fetchMockSuggestions({ exclude, the, random, limit, vung_mien })
    return mapSuggestionList(raw)
  }

  const query = {
    exclude: Array.isArray(exclude) ? exclude.join(',') : exclude,
    the: Array.isArray(the) ? the.join(',') : the,
    random: random ? 'true' : undefined,
    limit,
    vung_mien,
  }

  const raw = await get('/suggestions', { query, signal })
  return mapSuggestionList(raw)
}
