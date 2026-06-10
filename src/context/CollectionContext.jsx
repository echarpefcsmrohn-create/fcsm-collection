import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getScarves, addScarf, updateScarf, deleteScarf } from '../lib/supabase'

const CollectionContext = createContext(null)

export function CollectionProvider({ children }) {
  const [collection, setCollection] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async (retry = 0) => {
    try {
      setError(null)
      const data = await getScarves()
      setCollection(data)
    } catch (e) {
      if (retry < 3) {
        setTimeout(() => load(retry + 1), 3000)
      } else {
        setError(e.message)
      }
    } finally {
      if (retry === 0) setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const add = async (scarf) => {
    const saved = await addScarf(scarf)
    setCollection(prev => [saved, ...prev])
    return saved
  }

  const update = async (id, updates) => {
    await updateScarf(id, updates)
    setCollection(prev => prev.map(s => String(s.id) === String(id) ? { ...s, ...updates } : s))
  }

  const remove = async (id) => {
    await deleteScarf(id)
    setCollection(prev => prev.filter(s => String(s.id) !== String(id)))
  }

  return (
    <CollectionContext.Provider value={{ collection, loading, error, load, add, update, remove }}>
      {children}
    </CollectionContext.Provider>
  )
}

export const useCollection = () => useContext(CollectionContext)
