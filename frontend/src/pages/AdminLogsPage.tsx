import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

interface LogItem {
  timestamp: string
  level: string
  remote_addr: string
  username: string
  method: string
  path: string
  status: string
  message: string
}

function AdminLogsPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [logs, setLogs] = useState<LogItem[]>([])
  const [lines] = useState(200)
  const [message, setMessage] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const fetchAbort = useRef<AbortController | null>(null)
  const [filtersDirty, setFiltersDirty] = useState(false)

  const [usernameFilter, setUsernameFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [pathFilter, setPathFilter] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const [startFilter, setStartFilter] = useState('')
  const [endFilter, setEndFilter] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(50)
  // default to oldest-first
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [hasNext, setHasNext] = useState(false)

  const formatTimestamp = (tsRaw?: string) => {
    try {
      const ts = (tsRaw || '').trim()
      if (!ts) return ''
      let iso = ts
      if (!ts.includes('T')) iso = ts.replace(' ', 'T')
      if (iso.includes(',')) iso = iso.replace(',', '.')
      const d = new Date(iso)
      if (!isNaN(d.getTime())) return d.toLocaleString()
      const p = Date.parse(ts)
      if (!isNaN(p)) return new Date(p).toLocaleString()
      return ts
    } catch (e) {
      return tsRaw || ''
    }
  }

  useEffect(() => {
    checkAdminAndFetchLogs()
  }, [])

  const checkAdminAndFetchLogs = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }

    try {
      const me = await axios.get('/api/me', { headers: { Authorization: `Bearer ${token}` } })
      if (!me.data.success || !me.data.user.admin) {
        setMessage('Admin access required')
        setTimeout(() => navigate('/explore'), 2000)
        return
      }
      setIsAdmin(true)
      await fetchLogs()
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to verify admin')
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async (opts: { lines?: number; username?: string; method?: string; path?: string; search?: string; start?: string; end?: string; page?: number; per_page?: number } = {}) => {
    // cancel any in-flight fetch to avoid races when users click quickly
    if (fetchAbort.current) {
      try { fetchAbort.current.abort() } catch (e) {}
      fetchAbort.current = null
    }
    const controller = new AbortController()
    fetchAbort.current = controller
    setIsFetching(true)

    const token = localStorage.getItem('token')
    const params = new URLSearchParams()
    params.set('lines', String(opts.lines ?? lines))
    if (opts.username) params.set('username', opts.username)
    if (opts.method) params.set('method', opts.method)
    if (opts.path) params.set('path', opts.path)
    if (opts.search) params.set('search', opts.search)
    if (opts.start) params.set('start', opts.start)
    if (opts.end) params.set('end', opts.end)
    params.set('page', String(opts.page ?? page))
    const perPageEffective = opts.per_page ?? perPage
    // 0 = All, maps all of the logs to 1 page basically
    if (perPageEffective === 0) {
      params.set('per_page', String(1000000))
    } else {
      params.set('per_page', String(perPageEffective))
    }

    try {
      const resp = await axios.get(`/api/logs?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      if (resp.data.success) {
        const loaded = resp.data.logs || []
        // apply current client-side sort (default oldest-first)
        const parseTS = (ts?: string) => {
          if (!ts) return 0
          let s = ts.trim()
          if (!s.includes('T')) s = s.replace(' ', 'T')
          if (s.includes(',')) s = s.replace(',', '.')
          const p = Date.parse(s)
          if (!isNaN(p)) return p
          const d = new Date(s)
          return isNaN(d.getTime()) ? 0 : d.getTime()
        }
        const sorted = [...loaded].sort((a: LogItem, b: LogItem) => {
          const ta = parseTS(a.timestamp)
          const tb = parseTS(b.timestamp)
          return sortDir === 'asc' ? ta - tb : tb - ta
        })
        setLogs(sorted)
        // check whether there is a next page (useful for disabling Next button)
        try {
          // if showing all, there is no next page
          const perPageForCheck = opts.per_page ?? perPage
          if (perPageForCheck === 0) {
            setHasNext(false)
          } else {
            const nextPage = (opts.page ?? page) + 1
            await checkHasNext(nextPage, opts)
          }
        } catch (e) {
          setHasNext(false)
        }
      } else {
        setMessage(resp.data.message || 'Failed to load logs')
      }
    } catch (err: any) {
      // ignore cancellations
      if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return
      setMessage(err.response?.data?.message || 'Failed to load logs')
    } finally {
      setIsFetching(false)
      fetchAbort.current = null
    }
  }

  // Check if a given page index has any logs
  const checkHasNext = async (pageToCheck: number, baseOpts: { lines?: number; username?: string; method?: string; path?: string; search?: string; start?: string; end?: string; page?: number; per_page?: number } = {}) => {
    const token = localStorage.getItem('token')
    const params = new URLSearchParams()
    params.set('lines', String(baseOpts.lines ?? lines))
    if (baseOpts.username) params.set('username', baseOpts.username)
    if (baseOpts.method) params.set('method', baseOpts.method)
    if (baseOpts.path) params.set('path', baseOpts.path)
    if (baseOpts.search) params.set('search', baseOpts.search)
    if (baseOpts.start) params.set('start', baseOpts.start)
    if (baseOpts.end) params.set('end', baseOpts.end)
    params.set('page', String(pageToCheck))
    const perPageToUse = baseOpts.per_page ?? perPage
    if (perPageToUse === 0) {
      // showing all -> there is no next page
      setHasNext(false)
      return
    }
    params.set('per_page', String(perPageToUse))

    try {
      const resp = await axios.get(`/api/logs?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
      if (resp.data.success) {
        const nextLogs = resp.data.logs || []
        setHasNext(nextLogs.length > 0)
      } else {
        setHasNext(false)
      }
    } catch (err) {
      setHasNext(false)
    }
  }

  const toggleSortTime = () => {
    const next = sortDir === 'asc' ? 'desc' : 'asc'
    setSortDir(next)
    const parseTS = (ts?: string) => {
      if (!ts) return 0
      let s = ts.trim()
      if (!s.includes('T')) s = s.replace(' ', 'T')
      if (s.includes(',')) s = s.replace(',', '.')
      const p = Date.parse(s)
      if (!isNaN(p)) return p
      const d = new Date(s)
      return isNaN(d.getTime()) ? 0 : d.getTime()
    }
    const sorted = [...logs].sort((a, b) => {
      const ta = parseTS(a.timestamp)
      const tb = parseTS(b.timestamp)
      return next === 'asc' ? ta - tb : tb - ta
    })
    setLogs(sorted)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-900 dark:text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <button onClick={() => navigate('/explore')} className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="inline sm:hidden">Back</span>
            <span className="hidden sm:inline">Back to Explore</span>
          </button>

          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">Action Logs</h1>

          <div style={{ width: 92 }} />
        </div>

        <div className="mb-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-gray-700 dark:text-gray-300 block">Username</label>
            <input value={usernameFilter} onChange={(e) => { setUsernameFilter(e.target.value); setFiltersDirty(true); }} className="w-full px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="text-gray-700 dark:text-gray-300 block">Method</label>
            <input value={methodFilter} onChange={(e) => { setMethodFilter(e.target.value); setFiltersDirty(true); }} className="w-full px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="text-gray-700 dark:text-gray-300 block">Path</label>
            <input value={pathFilter} onChange={(e) => { setPathFilter(e.target.value); setFiltersDirty(true); }} placeholder="path filter" className="w-full px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="text-gray-700 dark:text-gray-300 block">Message Search</label>
            <input value={searchFilter} onChange={(e) => { setSearchFilter(e.target.value); setFiltersDirty(true); }} placeholder="search in message" className="w-full px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white" />
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-gray-700 dark:text-gray-300 block">Start (local)</label>
            <input type="datetime-local" value={startFilter} onChange={(e) => { setStartFilter(e.target.value); setFiltersDirty(true); }} className="w-full px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="text-gray-700 dark:text-gray-300 block">End (local)</label>
            <input type="datetime-local" value={endFilter} onChange={(e) => { setEndFilter(e.target.value); setFiltersDirty(true); }} className="w-full px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="text-gray-700 dark:text-gray-300 block">Per page</label>
            <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setFiltersDirty(true); }} className="w-full px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white">
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={0}>All</option>
            </select>
          </div>
          <div className="flex items-end justify-end gap-2 h-full">
            <button disabled={isFetching} onClick={async () => { setPage(1); await fetchLogs({ lines, username: usernameFilter, method: methodFilter, path: pathFilter, search: searchFilter, start: startFilter, end: endFilter, page: 1, per_page: perPage }); setFiltersDirty(false); }} className="px-3 py-1 bg-amber-500 dark:bg-purple-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed">Apply</button>
            <button disabled={isFetching} onClick={async () => { setUsernameFilter(''); setMethodFilter(''); setPathFilter(''); setSearchFilter(''); setStartFilter(''); setEndFilter(''); setPage(1); await fetchLogs({ lines, page:1, per_page: perPage }); setFiltersDirty(false); }} className="px-3 py-1 bg-gray-500 dark:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed">Reset</button>
          </div>
        </div>

        {message && <div className="mb-4 text-red-400">{message}</div>}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 h-[60vh] overflow-auto">
          {logs.length === 0 ? (
            <div className="text-gray-600 dark:text-gray-400">{filtersDirty ? 'Filters changed — click Apply to update results.' : 'No logs available.'}</div>
          ) : (
            <table className="min-w-full text-sm text-left text-gray-800 dark:text-gray-200">
              <thead className="text-xs text-gray-600 dark:text-gray-400 uppercase bg-gray-100 dark:bg-gray-700 sticky top-0">
                <tr>
                  <th className="px-3 py-2">
                    <button onClick={toggleSortTime} className="inline-flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                      <span>Time</span>
                      {sortDir === 'asc' ? (
                        <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      ) : sortDir === 'desc' ? (
                        <svg className="w-4 h-4 text-gray-700 dark:text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11h10M7 13h6" />
                        </svg>
                      )}
                    </button>
                  </th>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">IP</th>
                  <th className="px-3 py-2">Method</th>
                  <th className="px-3 py-2">Path</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'}>
                    <td className="px-3 py-2 align-top">{formatTimestamp(l.timestamp)}</td>
                    <td className="px-3 py-2 align-top">{l.username}</td>
                    <td className="px-3 py-2 align-top">{l.remote_addr}</td>
                    <td className="px-3 py-2 align-top">{l.method}</td>
                    <td className="px-3 py-2 align-top">{l.path}</td>
                    <td className="px-3 py-2 align-top">{l.status}</td>
                    <td className="px-3 py-2 align-top"><div className="whitespace-pre-wrap text-xs text-gray-700 dark:text-gray-300">{l.message}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="mt-3 flex items-center justify-between">
            <div className="text-gray-700 dark:text-gray-300">Page {page}</div>
            <div className="flex items-center gap-2">
              <button disabled={isFetching || page <= 1} onClick={() => { const np = Math.max(1, page - 1); setPage(np); fetchLogs({ lines, username: usernameFilter, method: methodFilter, path: pathFilter, search: searchFilter, start: startFilter, end: endFilter, page: np, per_page: perPage }) } } className="px-3 py-1 bg-gray-500 dark:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed">Prev</button>
              <button disabled={isFetching || !hasNext} onClick={() => { const np = page + 1; setPage(np); fetchLogs({ lines, username: usernameFilter, method: methodFilter, path: pathFilter, search: searchFilter, start: startFilter, end: endFilter, page: np, per_page: perPage }) } } className="px-3 py-1 bg-gray-500 dark:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminLogsPage
