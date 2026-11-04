import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'

export function createApp(client) {
  const app = express()
  app.disable('x-powered-by')
  app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }))
  app.use(express.json({ limit: '16kb' }))
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', databaseConfigured: Boolean(client) }))
  app.use('/api', (_req, res, next) => {
    if (!client) return res.status(503).json({ error: 'Configure the backend Supabase environment variables first.' })
    next()
  })
  app.get('/api/dishes', async (_req, res) => {
    const { data, error } = await client.from('mon_an').select('ma_mon, ten_mon, mo_ta_ngan, hinh_anh')
      .eq('trang_thai', 'ACTIVE').order('ten_mon').limit(100)
    if (error) return res.status(502).json({ error: 'Could not load dishes. Check your database schema and backend configuration.' })
    res.json(data)
  })
  app.get('/api/me', async (req, res) => {
    const token = req.headers.authorization?.match(/^Bearer\s+(\S+)$/i)?.[1]
    if (!token) return res.status(401).json({ error: 'Sign in to view your profile.' })
    const { data, error } = await client.auth.getUser(token)
    if (error || !data.user) return res.status(401).json({ error: 'Your session has expired. Please sign in again.' })
    const { data: profile, error: profileError } = await client.from('nguoi_dung')
      .select('ma_nd, ten_hien_thi, anh_dai_dien, vai_tro, trang_thai').eq('ma_nd', data.user.id).maybeSingle()
    if (profileError) return res.status(502).json({ error: 'Could not load your profile.' })
    if (!profile) return res.status(409).json({ error: 'No profile found. Check the auth.users profile-creation trigger.' })
    if (profile.trang_thai !== 'ACTIVE') return res.status(403).json({ error: 'This account is inactive.' })
    res.json(profile)
  })
  app.use((_req, res) => res.status(404).json({ error: 'Endpoint not found.' }))
  app.use((error, _req, res, _next) => {
    const status = error.status === 400 ? 400 : 500
    res.status(status).json({ error: status === 400 ? 'Invalid JSON request.' : 'An unexpected server error occurred.' })
  })
  return app
}
const client = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) : null
export default createApp(client)
