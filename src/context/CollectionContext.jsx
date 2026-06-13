import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getScarves, addScarf, updateScarf, deleteScarf } from '../lib/supabase'

const CACHE_KEY = 'fcsm_collection_cache'
const CollectionContext = createContext(null)

export function CollectionProvider({ children }) {
  const [collection, setCollection] = useState(() => {
    // Load from local cache instantly
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      return cached ? JSON.parse(cached) : []
    } catch { return [] }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const saveCache = (data) => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch {}
  }

  const load = useCallback(async (retry = 0) => {
    try {
      setError(null)
      const data = await getScarves()
      setCollection(data)
      saveCache(data)
    } catch (e) {
      if (retry < 3) {
        setTimeout(() => load(retry + 1), 3000)
      } else {
        setError(e.message)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const add = async (scarf) => {
    const saved = await addScarf(scarf)
    setCollection(prev => {
      const next = [saved, ...prev]
      saveCache(next)
      return next
    })
    return saved
  }

  const update = async (id, updates) => {
    await updateScarf(id, updates)
    setCollection(prev => {
      const next = prev.map(s => String(s.id) === String(id) ? { ...s, ...updates } : s)
      saveCache(next)
      return next
    })
  }

  const remove = async (id) => {
    await deleteScarf(id)
    setCollection(prev => {
      const next = prev.filter(s => String(s.id) !== String(id))
      saveCache(next)
      return next
    })
  }

  return (
    <CollectionContext.Provider value={{ collection, loading, error, load, add, update, remove }}>
      {children}
    </CollectionContext.Provider>
  )
}

export const useCollection = () => useContext(CollectionContext)
