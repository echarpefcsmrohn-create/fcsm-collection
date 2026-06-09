import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection } from '../context/CollectionContext'
import { getEraLabel, getScarfNumber } from '../lib/eras'
import PageHeader from '../components/PageHeader'

export default function DailyPage() {
  const { collection } = useCollection()
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState(null)
  const [items, setItems] = useState([])
  const [offset, setOffset] = useState(0)
  const trackRef = useRef()

  const spin = () => {
    if (spinning || !collection.length) return
    setWinner(null)
    setSpinning(true)

    // Generate 60 random items
    const generated = Array.from({ length: 60 }, () => collection[Math.floor(Math.random() * collection.length)])
    const winnerIdx = 48 + Math.floor(Math.random() * 3)
    const picked = collection[Math.floor(Math.random() * collection.length)]
    generated[winnerIdx] = picked
    setItems(generated)

    const itemW = 156
    const wrapW = 320
    const newOffset = winnerIdx * itemW - (wrapW / 2) + (itemW / 2) + (Math.random() * 40 - 20)
    setOffset(0)
    setTimeout(() => setOffset(newOffset), 50)
    setTimeout(() => { setWinner(picked); setSpinning(false) }, 7500)
  }

  return (
    <div className="pb-24">
      <PageHeader title="ÉCHARPE DU JOUR" subtitle="Laisse le hasard choisir 🎲" />
      <div className="px-4 pt-6 flex flex-col items-center gap-6">

        {/* Slot track */}
        <div className="w-full relative overflow-hidden rounded-2xl border border-bord bg-surface h-44">
          {/* Center line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-jaune -translate-x-1/2 z-10"
            style={{ boxShadow: '0 0 12px rgba(245,196,0,0.6)' }} />
          <div className="absolute left-1/2 top-0 -translate-x-1/2 text-jaune z-10 text-sm">▼</div>
          {/* Fades */}
          <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to right, #0D1530, transparent)' }} />
          <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to left, #0D1530, transparent)' }} />

          <div ref={trackRef} className="flex items-center gap-2 p-2 absolute"
            style={{ transform: `translateX(-${offset}px)`, transition: spinning ? 'transform 7s cubic-bezier(0.05, 0.8, 0.25, 1)' : 'none' }}>
            {(items.length ? items : Array(10).fill(null)).map((s, i) => (
              <div key={i} className="flex-shrink-0 w-36 h-40 rounded-xl overflow-hidden border border-bord bg-surface2 flex flex-col">
                <div className="flex-1 overflow-hidden flex items-center justify-center">
                  {s?.photo_url
                    ? <img src={s.photo_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-3xl opacity-20">🧣</span>}
                </div>
                {s && <div className="px-2 py-1 text-[0.6rem] font-bold text-jaune font-bebas truncate bg-surface">#{getScarfNumber(s, collection)}</div>}
                {s && <div className="px-2 pb-1.5 text-[0.6rem] truncate text-white">{s.Name}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Button */}
        <motion.button
          className="w-full max-w-xs py-5 bg-jaune text-bleu2 font-bebas text-2xl tracking-[3px] rounded-2xl cursor-pointer disabled:opacity-40"
          style={!spinning ? { boxShadow: '0 4px 30px rgba(245,196,0,0.4)', animation: 'pulse 2s infinite' } : {}}
          whileTap={{ scale: 0.96 }}
          onClick={spin}
          disabled={spinning || !collection.length}
        >
          {spinning ? '⏳ EN COURS...' : '🎲 CHOISIR MON ÉCHARPE'}
        </motion.button>

        {/* Winner */}
        <AnimatePresence>
          {winner && (
            <motion.div className="w-full bg-surface border-2 border-jaune rounded-2xl overflow-hidden"
              initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}>
              <div className="aspect-[3/2] bg-surface2 flex items-center justify-center overflow-hidden">
                {winner.photo_url
                  ? <img src={winner.photo_url} alt={winner.Name} className="w-full h-full object-contain" />
                  : <span className="text-6xl opacity-20">🧣</span>}
              </div>
              <div className="text-center py-4 px-5"
                style={{ background: 'linear-gradient(135deg, #2a1f00, #3d2d00, #2a1f00)' }}>
                <div className="text-[#D4A900] text-xs tracking-[2px] font-bebas mb-1">
                  #{getScarfNumber(winner, collection)}
                </div>
                <div className="font-bebas text-2xl tracking-[3px] text-jaune">{winner.Name}</div>
                {winner.era && <div className="text-[#D4A900] text-xs tracking-widest mt-1">⊞ {getEraLabel(winner.era)}</div>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
