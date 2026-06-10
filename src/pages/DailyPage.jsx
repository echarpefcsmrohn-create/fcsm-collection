import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection } from '../context/CollectionContext'
import { getEraLabel, getScarfNumber } from '../lib/eras'
import PageHeader from '../components/PageHeader'

// Generates slot machine tick sound using Web Audio API
function createTickSound(audioCtx, freq = 800, vol = 0.3) {
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.connect(gain)
  gain.connect(audioCtx.destination)
  osc.frequency.value = freq
  osc.type = 'square'
  gain.gain.setValueAtTime(vol, audioCtx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08)
  osc.start(audioCtx.currentTime)
  osc.stop(audioCtx.currentTime + 0.08)
}

function createWinSound(audioCtx) {
  // Victory fanfare
  const notes = [523, 659, 784, 1047]
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.frequency.value = freq
    osc.type = 'triangle'
    const t = audioCtx.currentTime + i * 0.12
    gain.gain.setValueAtTime(0.4, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
    osc.start(t)
    osc.stop(t + 0.25)
  })
}

export default function DailyPage() {
  const { collection } = useCollection()
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState(null)
  const [items, setItems] = useState([])
  const [offset, setOffset] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const audioCtxRef = useRef(null)
  const tickIntervalRef = useRef(null)

  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    return audioCtxRef.current
  }

  const spin = useCallback(() => {
    if (spinning || !collection.length) return
    setWinner(null)
    setSpinning(true)
    setTransitioning(false)

    // Generate 60 random items
    const generated = Array.from({ length: 60 }, () =>
      collection[Math.floor(Math.random() * collection.length)]
    )
    const winnerIdx = 46 + Math.floor(Math.random() * 4)
    const picked = collection[Math.floor(Math.random() * collection.length)]
    generated[winnerIdx] = picked
    setItems(generated)
    setOffset(0)

    const itemW = 156 // width + gap
    const wrapW = 320
    const newOffset = winnerIdx * itemW - (wrapW / 2) + (itemW / 2) + (Math.random() * 30 - 15)

    // Start tick sounds
    const ctx = getAudioCtx()
    let tickCount = 0
    let tickDelay = 60 // ms, starts fast

    const scheduleTick = () => {
      if (tickCount > 80) return
      createTickSound(ctx, 600 + Math.random() * 200, 0.15)
      tickCount++
      // Slow down over time
      tickDelay = Math.min(tickDelay * 1.04, 400)
      tickIntervalRef.current = setTimeout(scheduleTick, tickDelay)
    }
    scheduleTick()

    setTimeout(() => setOffset(newOffset), 50)

    // End animation
    setTimeout(() => {
      clearTimeout(tickIntervalRef.current)
      setTransitioning(true)
      setSpinning(false)
      setWinner(picked)
      // Win sound
      setTimeout(() => createWinSound(getAudioCtx()), 300)
    }, 7200)
  }, [collection, spinning])

  const ITEM_W = 148

  return (
    <div className="pb-24">
      <PageHeader title="ÉCHARPE DU JOUR" subtitle="Laisse le hasard choisir 🎲" />
      <div className="px-4 pt-6 flex flex-col items-center gap-6">

        {/* Slot track */}
        <div className="w-full relative overflow-hidden rounded-2xl border border-bord bg-surface" style={{ height: '176px' }}>
          {/* Center marker */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 z-10 pointer-events-none"
            style={{ background: 'var(--jaune)', boxShadow: '0 0 12px rgba(245,196,0,0.7)' }} />
          <div className="absolute left-1/2 -translate-x-1/2 -top-px z-10 text-jaune text-xs pointer-events-none">▼</div>
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-px z-10 text-jaune text-xs pointer-events-none rotate-180">▼</div>

          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to right, #0D1530, transparent)' }} />
          <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to left, #0D1530, transparent)' }} />

          {/* Track */}
          <div className="flex items-center gap-2 p-2 absolute top-0 left-0"
            style={{
              transform: `translateX(-${offset}px)`,
              transition: spinning ? 'transform 7s cubic-bezier(0.05, 0.8, 0.25, 1)' : 'none'
            }}>
            {(items.length ? items : Array(8).fill(null)).map((s, i) => (
              <div key={i}
                className="flex-shrink-0 rounded-xl overflow-hidden border bg-surface2 flex flex-col"
                style={{
                  width: `${ITEM_W}px`,
                  height: '160px',
                  borderColor: transitioning && s?.id === winner?.id && i === items.findIndex((x,idx) => x?.id === winner?.id && idx > 40)
                    ? 'rgba(245,196,0,0.8)' : 'var(--bord)',
                  boxShadow: transitioning && s?.id === winner?.id && i === items.findIndex((x,idx) => x?.id === winner?.id && idx > 40)
                    ? '0 0 20px rgba(245,196,0,0.4)' : 'none'
                }}>
                <div className="flex-1 overflow-hidden flex items-center justify-center">
                  {s?.photo_url
                    ? <img src={s.photo_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    : <span className="text-3xl opacity-20">🧣</span>}
                </div>
                {s && (
                  <>
                    <div className="px-2 pt-1 text-[0.6rem] font-bebas text-jaune tracking-wide bg-surface">
                      #{getScarfNumber(s, collection)}
                    </div>
                    <div className="px-2 pb-1.5 text-[0.58rem] truncate text-white bg-surface">{s.Name}</div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Spin button */}
        <motion.button
          className="w-full max-w-xs py-5 font-bebas text-2xl tracking-[3px] rounded-2xl cursor-pointer disabled:opacity-40"
          style={{
            background: spinning ? '#1a2a4a' : 'var(--jaune)',
            color: spinning ? 'var(--muted)' : 'var(--bleu2)',
            boxShadow: !spinning ? '0 4px 30px rgba(245,196,0,0.4)' : 'none',
            animation: !spinning && !winner ? 'pulse 2s infinite' : 'none'
          }}
          whileTap={{ scale: 0.96 }}
          onClick={spin}
          disabled={spinning || !collection.length}
        >
          {spinning ? '⏳ EN COURS...' : winner ? '🎲 RELANCER' : '🎲 CHOISIR MON ÉCHARPE'}
        </motion.button>

        {/* Winner reveal */}
        <AnimatePresence>
          {winner && (
            <motion.div
              className="w-full rounded-2xl overflow-hidden border-2 border-jaune"
              initial={{ opacity:0, scale:0.9, y:20 }}
              animate={{ opacity:1, scale:1, y:0 }}
              exit={{ opacity:0, scale:0.9 }}
              transition={{ type:'spring', damping:20, stiffness:300 }}>

              <div className="aspect-[3/2] bg-surface2 flex items-center justify-center overflow-hidden cursor-zoom-in">
                {winner.photo_url
                  ? <img src={winner.photo_url} alt={winner.Name} className="w-full h-full object-contain" />
                  : <span className="text-8xl opacity-10">🧣</span>}
              </div>

              {/* Plaque dorée */}
              <div className="text-center py-4 px-5 relative"
                style={{
                  background: 'linear-gradient(135deg, #2a1f00, #3d2d00, #2a1f00)',
                  borderTop: '1px solid rgba(245,196,0,0.3)'
                }}>
                <div className="absolute inset-[3px] border border-jaune/15 rounded-sm pointer-events-none" />
                <div className="font-bebas text-jaune/60 text-[0.65rem] tracking-[3px] mb-1">
                  #{getScarfNumber(winner, collection)}
                </div>
                <div className="font-bebas text-2xl tracking-[3px] text-jaune">{winner.Name}</div>
                {winner.era && (
                  <div className="text-jaune/70 text-[0.65rem] tracking-[2px] mt-1">
                    ⊞ {getEraLabel(winner.era)}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!collection.length && (
          <div className="text-center py-8">
            <div className="text-5xl opacity-20 mb-3">🧣</div>
            <div className="font-bebas text-2xl tracking-widest text-muted">Collection vide</div>
            <div className="text-muted text-sm mt-1">Ajoute des écharpes pour lancer la roulette !</div>
          </div>
        )}
      </div>
    </div>
  )
}
