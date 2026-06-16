import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection } from '../context/CollectionContext'
import { getEraLabel, getScarfNumber } from '../lib/eras'
import PageHeader from '../components/PageHeader'
import { playTick, playWin, vibrate } from '../lib/sounds'

const HISTORY_KEY = 'fcsm_daily_history'

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
}
function saveHistory(h) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)) } catch {}
}

export default function DailyPage() {
  const { collection } = useCollection()
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState(null)
  const [items, setItems] = useState([])
  const [offset, setOffset] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const [winnerIdxState, setWinnerIdxState] = useState(48)
  const [animating, setAnimating] = useState(false)
  const [history, setHistory] = useState(loadHistory)
  const [showHistory, setShowHistory] = useState(false)
  const tickIntervalRef = useRef(null)
  const idleAnimRef = useRef(null)
  const [idleOffset, setIdleOffset] = useState(0)
  const ITEM_W = 156

  // Idle slow scroll before spin
  useEffect(() => {
    if (spinning || !collection.length) return
    let pos = 0
    const scroll = () => {
      pos += 0.4
      const maxPos = collection.length * ITEM_W
      if (pos >= maxPos) pos = 0
      setIdleOffset(pos)
      idleAnimRef.current = requestAnimationFrame(scroll)
    }
    idleAnimRef.current = requestAnimationFrame(scroll)
    return () => cancelAnimationFrame(idleAnimRef.current)
  }, [spinning, collection.length])

  const spin = useCallback(() => {
    if (spinning || !collection.length) return
    cancelAnimationFrame(idleAnimRef.current)
    setWinner(null)
    setSpinning(true)
    setTransitioning(false)

    const winnerIdx = 46 + Math.floor(Math.random() * 4)
    const picked = collection[Math.floor(Math.random() * collection.length)]
    const generated = Array.from({ length: 60 }, () =>
      collection[Math.floor(Math.random() * collection.length)]
    )
    generated[winnerIdx] = picked  // l'écharpe gagnante EST à winnerIdx

    const wrapW = 320
    const newOffset = winnerIdx * ITEM_W - (wrapW / 2) + (ITEM_W / 2)

    setWinnerIdxState(winnerIdx)
    // Reset items ET offset ensemble, puis on attend un vrai frame avant d'animer
    setItems(generated)
    setOffset(0)

    let tickCount = 0
    let tickDelay = 60
    const scheduleTick = () => {
      if (tickCount > 80) return
      playTick(600 + Math.random() * 200)
      vibrate([5])
      tickCount++
      tickDelay = Math.min(tickDelay * 1.04, 400)
      tickIntervalRef.current = setTimeout(scheduleTick, tickDelay)
    }
    scheduleTick()

    // Attendre 2 frames pour que React ait rendu avec offset=0 SANS transition
    // avant de déclencher l'animation vers newOffset
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimating(true)
        setOffset(newOffset)
      })
    })

    setTimeout(() => {
      clearTimeout(tickIntervalRef.current)
      setTransitioning(true)
      setSpinning(false)
      setAnimating(false)
      setWinner(picked)
      vibrate([30, 20, 80])
      setTimeout(() => playWin(), 300)

      // Save to history
      const entry = {
        id: Date.now(),
        scarfId: picked.id,
        scarfName: picked.Name,
        photo: picked.photo_url,
        era: picked.era,
        date: new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
      }
      const newHistory = [entry, ...loadHistory()]
      setHistory(newHistory)
      saveHistory(newHistory)
    }, 7200)
  }, [collection, spinning])

  const deleteHistory = (id) => {
    const newHistory = history.filter(h => h.id !== id)
    setHistory(newHistory)
    saveHistory(newHistory)
  }

  // Count per scarf
  const counts = {}
  history.forEach(h => {
    counts[h.scarfName] = (counts[h.scarfName] || 0) + 1
  })
  const topScarves = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 5)

  // Idle items (loop collection twice)
  const idleItems = collection.length > 0 ? [...collection, ...collection, ...collection] : []

  return (
    <div className="pb-24">
      <PageHeader title="ÉCHARPE DU JOUR" subtitle="Laisse le hasard choisir 🎲" />
      <div className="px-4 pt-6 flex flex-col items-center gap-5">

        {/* Slot track */}
        <div className="w-full relative overflow-hidden rounded-2xl border border-bord bg-surface" style={{ height: '176px' }}>
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 z-10 pointer-events-none"
            style={{ background: 'var(--jaune)', boxShadow: '0 0 12px rgba(245,196,0,0.7)' }} />
          <div className="absolute left-1/2 -translate-x-1/2 -top-px z-10 text-jaune text-xs pointer-events-none">▼</div>
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-px z-10 text-jaune text-xs pointer-events-none rotate-180">▼</div>
          <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to right, #0D1530, transparent)' }} />
          <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to left, #0D1530, transparent)' }} />

          {/* Idle scroll */}
          {!spinning && items.length === 0 && (
            <div className="flex items-center gap-2 p-2 absolute top-0 left-0"
              style={{ transform: `translateX(-${idleOffset % (collection.length * ITEM_W)}px)` }}>
              {idleItems.map((s, i) => (
                <div key={i} className="flex-shrink-0 rounded-xl overflow-hidden border border-bord bg-surface2 flex flex-col"
                  style={{ width:`${ITEM_W}px`, height:'160px' }}>
                  <div className="flex-1 overflow-hidden flex items-center justify-center">
                    {s?.photo_url
                      ? <img src={s.photo_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      : <span className="text-3xl opacity-20">🧣</span>}
                  </div>
                  <div className="px-2 pt-1 text-[0.6rem] font-bebas text-jaune tracking-wide bg-surface">#{ getScarfNumber(s, collection)}</div>
                  <div className="px-2 pb-1.5 text-[0.58rem] truncate text-white bg-surface">{s?.Name}</div>
                </div>
              ))}
            </div>
          )}

          {/* Spin track */}
          {(spinning || items.length > 0) && (
            <div className="flex items-center gap-2 p-2 absolute top-0 left-0"
              style={{
                transform: `translateX(-${offset}px)`,
                transition: animating ? 'transform 7s cubic-bezier(0.05, 0.8, 0.25, 1)' : 'none'
              }}>
              {items.map((s, i) => (
                <div key={i} className="flex-shrink-0 rounded-xl overflow-hidden border bg-surface2 flex flex-col"
                  style={{ width:`${ITEM_W}px`, height:'160px', borderColor: transitioning && i === winnerIdxState ? 'rgba(245,196,0,0.8)' : 'var(--bord)' }}>
                  <div className="flex-1 overflow-hidden flex items-center justify-center">
                    {s?.photo_url
                      ? <img src={s.photo_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      : <span className="text-3xl opacity-20">🧣</span>}
                  </div>
                  {s && <>
                    <div className="px-2 pt-1 text-[0.6rem] font-bebas text-jaune tracking-wide bg-surface">#{getScarfNumber(s, collection)}</div>
                    <div className="px-2 pb-1.5 text-[0.58rem] truncate text-white bg-surface">{s.Name}</div>
                  </>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Spin button */}
        <motion.button
          className="w-full max-w-xs py-5 font-bebas text-2xl tracking-[3px] rounded-2xl cursor-pointer disabled:opacity-40"
          style={{
            background: spinning ? '#1a2a4a' : '#F5C400',
            color: spinning ? 'var(--muted)' : '#001f5c',
            boxShadow: !spinning ? '0 4px 30px rgba(245,196,0,0.4)' : 'none',
          }}
          whileTap={{ scale: 0.96 }}
          onClick={spin}
          disabled={spinning || !collection.length}>
          {spinning ? '⏳ EN COURS...' : winner ? '🎲 RELANCER' : '🎲 CHOISIR MON ÉCHARPE'}
        </motion.button>

        {/* Winner */}
        <AnimatePresence>
          {winner && (
            <motion.div className="w-full rounded-2xl overflow-hidden border-2 border-jaune"
              initial={{ opacity:0, scale:0.9, y:20 }}
              animate={{ opacity:1, scale:1, y:0 }}
              exit={{ opacity:0 }}
              transition={{ type:'spring', damping:20, stiffness:300 }}>
              <div className="aspect-[3/2] bg-surface2 flex items-center justify-center overflow-hidden">
                {winner.photo_url
                  ? <img src={winner.photo_url} alt={winner.Name} className="w-full h-full object-contain" />
                  : <span className="text-8xl opacity-10">🧣</span>}
              </div>
              <div className="text-center py-4 px-5 relative"
                style={{ background: 'linear-gradient(135deg, #2a1f00, #3d2d00, #2a1f00)', borderTop: '1px solid rgba(245,196,0,0.3)' }}>
                <div className="absolute inset-[3px] border border-jaune/15 rounded-sm pointer-events-none" />
                <div className="font-bebas text-jaune/60 text-[0.65rem] tracking-[3px] mb-1">#{getScarfNumber(winner, collection)}</div>
                <div className="font-bebas text-2xl tracking-[3px] text-jaune">{winner.Name}</div>
                {winner.era && <div className="text-jaune/70 text-[0.65rem] tracking-[2px] mt-1">⊞ {getEraLabel(winner.era)}</div>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History toggle */}
        {history.length > 0 && (
          <motion.button
            className="w-full py-3 bg-surface border border-bord rounded-2xl font-bebas tracking-widest text-sm text-muted cursor-pointer flex items-center justify-between px-5"
            whileTap={{ scale:0.97 }}
            onClick={() => setShowHistory(!showHistory)}>
            <span>📋 HISTORIQUE ({history.length} tirages)</span>
            <span>{showHistory ? '▲' : '▼'}</span>
          </motion.button>
        )}

        {/* History list */}
        <AnimatePresence>
          {showHistory && (
            <motion.div className="w-full flex flex-col gap-3"
              initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>

              {/* Top scarves */}
              {topScarves.length > 0 && (
                <div className="bg-surface border border-bord rounded-2xl p-4">
                  <div className="text-muted text-xs uppercase tracking-widest mb-3">🏆 Les plus tirées</div>
                  {topScarves.map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between py-1.5 border-b border-bord last:border-0">
                      <span className="text-sm truncate flex-1 mr-2">{name}</span>
                      <span className="font-bebas text-jaune text-base">{count}x</span>
                    </div>
                  ))}
                </div>
              )}

              {/* History entries */}
              <div className="bg-surface border border-bord rounded-2xl overflow-hidden">
                <div className="text-muted text-xs uppercase tracking-widest p-4 pb-2">🕐 Derniers tirages</div>
                {history.map((h, i) => (
                  <motion.div key={h.id}
                    className="flex items-center gap-3 px-4 py-3 border-t border-bord"
                    initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0, x:-20 }}>
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface2 flex-shrink-0">
                      {h.photo
                        ? <img src={h.photo} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-lg">🧣</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{h.scarfName}</div>
                      <div className="text-muted text-xs">{h.date}</div>
                    </div>
                    <motion.button
                      onClick={() => deleteHistory(h.id)}
                      whileTap={{ scale:0.85 }}
                      className="w-7 h-7 rounded-full bg-surface2 text-red-400 flex items-center justify-center text-xs cursor-pointer flex-shrink-0">
                      ✕
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!collection.length && (
          <div className="text-center py-8">
            <div className="text-5xl opacity-20 mb-3">🧣</div>
            <div className="font-bebas text-2xl tracking-widest text-muted">Collection vide</div>
          </div>
        )}
      </div>
    </div>
  )
}
