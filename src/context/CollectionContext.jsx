import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { getScarves, addScarf, updateScarf, deleteScarf } from '../lib/supabase'

// v2 : nouvelle clé pour purger les anciens caches qui contenaient les
// embeddings (~2 Mo, proche de la limite localStorage de 5 Mo).
const CACHE_KEY = 'fcsm_collection_cache_v2'
const OLD_CACHE_KEYS = ['fcsm_collection_cache']
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

  // Nettoyage des anciens caches devenus obsolètes
  useEffect(() => {
    OLD_CACHE_KEYS.forEach(k => { try { localStorage.removeItem(k) } catch {} })
  }, [])

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

  const add = useCallback(async (scarf) => {
    const saved = await addScarf(scarf)
    setCollection(prev => {
      const next = [saved, ...prev]
      saveCache(next)
      return next
    })
    return saved
  }, [])

  const update = useCallback(async (id, updates) => {
    await updateScarf(id, updates)
    setCollection(prev => {
      const next = prev.map(s => String(s.id) === String(id) ? { ...s, ...updates } : s)
      saveCache(next)
      return next
    })
  }, [])

  const remove = useCallback(async (id) => {
    await deleteScarf(id)
    setCollection(prev => {
      const next = prev.filter(s => String(s.id) !== String(id))
      saveCache(next)
      return next
    })
  }, [])

  // Référence stable : sans ce useMemo, l'objet est recréé à chaque render
  // et tous les composants abonnés (dont les 100 cartes) re-rendent.
  const value = useMemo(
    () => ({ collection, loading, error, load, add, update, remove }),
    [collection, loading, error, load, add, update, remove]
  )

  return (
    <CollectionContext.Provider value={value}>
      {children}
    </CollectionContext.Provider>
  )
}

export const useCollection = () => useContext(CollectionContext)
