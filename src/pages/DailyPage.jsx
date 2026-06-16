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

const COLORS = [
  '#0a1830', '#1a2d5a', '#0f1e3d', '#152244',
  '#1c2f5c', '#091528', '#112040', '#0d1b38'
]

function FortuneWheel({ collection, spinning, targetIndex, onSpinEnd }) {
  const canvasRef = useRef(null)
  const angleRef = useRef(0)
  const rafRef = useRef(null)
  const n = collection.length

  const draw = useCallback((angle) => {
    const canvas = canvasRef.current
    if (!canvas || n === 0) return
    const ctx = canvas.getContext('2d')
    const S = canvas.width
    const cx = S / 2, cy = S / 2
    const R = S / 2 - 4
    const sliceAngle = (2 * Math.PI) / n

    ctx.clearRect(0, 0, S, S)

    for (let i = 0; i < n; i++) {
      const startA = angle + i * sliceAngle
      const endA = startA + sliceAngle
      const midA = startA + sliceAngle / 2

      // Segment
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, R, startA, endA)
      ctx.closePath()
      ctx.fillStyle = COLORS[i % COLORS.length]
      ctx.fill()
      ctx.strokeStyle = 'rgba(245,196,0,0.4)'
      ctx.lineWidth = 1
      ctx.stroke()

      // Numéro
      const num = String(i + 1).padStart(3, '0')
      const textR = R * 0.68
      const tx = cx + textR * Math.cos(midA)
      const ty = cy + textR * Math.sin(midA)

      ctx.save()
      ctx.translate(tx, ty)
      ctx.rotate(midA + Math.PI / 2)
      ctx.fillStyle = '#F5C400'
      ctx.font = `bold ${Math.max(7, Math.min(14, 280 / n))}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`#${num}`, 0, 0)
      ctx.restore()
    }

    // Cercle extérieur
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, 2 * Math.PI)
    ctx.strokeStyle = '#F5C400'
    ctx.lineWidth = 3
    ctx.shadowColor = '#F5C400'
    ctx.shadowBlur = 10
    ctx.stroke()
    ctx.shadowBlur = 0

    // Centre
    ctx.beginPath()
    ctx.arc(cx, cy, 14, 0, 2 * Math.PI)
    ctx.fillStyle = '#F5C400'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx, cy, 8, 0, 2 * Math.PI)
    ctx.fillStyle = '#001f5c'
    ctx.fill()

  }, [n, collection])

  // Idle rotation lente
  useEffect(() => {
    if (spinning || n === 0) return
    cancelAnimationFrame(rafRef.current)
    const animate = () => {
      angleRef.current += 0.004
      draw(angleRef.current)
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [spinning, n, draw])

  // Spin
  useEffect(() => {
    if (!spinning || n === 0) return
    cancelAnimationFrame(rafRef.current)

    const sliceAngle = (2 * Math.PI) / n
    // La flèche est à droite (angle 0) — on calcule l'angle final pour que targetIndex soit là
    const targetAngle = -(targetIndex * sliceAngle + sliceAngle / 2)
    const fullTurns = (6 + Math.floor(Math.random() * 4)) * 2 * Math.PI
    const startAngle = angleRef.current
    // Normaliser pour que la rotation soit toujours dans le bon sens
    const endAngle = targetAngle - fullTurns
    const totalDelta = endAngle - startAngle

    const duration = 6500
    const start = performance.now()
    let lastSegment = -1

    const animate = (now) => {
      const t = Math.min((now - start) / duration, 1)
      // Ease out cubic
      const ease = 1 - Math.pow(1 - t, 3)
      const currentAngle = startAngle + totalDelta * ease
      angleRef.current = currentAngle

      // Son tick par segment
      const seg = Math.floor(((-currentAngle % (2 * Math.PI)) / (2 * Math.PI)) * n + n) % n
      if (seg !== lastSegment && t < 0.9) {
        playTick(300 + (1 - t) * 500)
        vibrate([3])
        lastSegment = seg
      }

      draw(currentAngle)

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        angleRef.current = endAngle
        draw(endAngle)
        onSpinEnd()
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [spinning, targetIndex, n])

  useEffect(() => { draw(angleRef.current) }, [collection, draw])

  return (
    <div className="relative flex items-center justify-center w-full">
      {/* Flèche indicateur à droite */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex items-center"
        style={{ right: 'calc(50% - 148px)' }}>
        <div style={{
          width: 0, height: 0,
          borderTop: '12px solid transparent',
          borderBottom: '12px solid transparent',
          borderRight: '22px solid #F5C400',
          filter: 'drop-shadow(0 0 6px #F5C400)'
        }} />
      </div>
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="rounded-full"
        style={{ maxWidth: 300 }}
      />
    </div>
  )
}

export default function DailyPage() {
  const { collection } = useCollection()
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState(null)
  const [targetIndex, setTargetIndex] = useState(0)
  const [history, setHistory] = useState(loadHistory)
  const [showHistory, setShowHistory] = useState(false)

  const spin = useCallback(() => {
    if (spinning || !collection.length) return
    setWinner(null)
    setSpinning(true)
    const idx = Math.floor(Math.random() * collection.length)
    setTargetIndex(idx)
  }, [collection, spinning])

  const handleSpinEnd = useCallback(() => {
    const picked = collection[targetIndex]
    setSpinning(false)
    setWinner(picked)
    vibrate([30, 20, 80])
    setTimeout(() => playWin(), 200)

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
  }, [collection, targetIndex])

  const deleteHistory = (id) => {
    const newHistory = history.filter(h => h.id !== id)
    setHistory(newHistory)
    saveHistory(newHistory)
  }

  const counts = {}
  history.forEach(h => { counts[h.scarfName] = (counts[h.scarfName] || 0) + 1 })
  const topScarves = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 5)

  return (
    <div className="pb-24">
      <PageHeader title="ÉCHARPE DU JOUR" subtitle="Laisse le hasard choisir 🎲" />
      <div className="px-4 pt-4 flex flex-col items-center gap-5">

        {collection.length > 0
          ? <FortuneWheel
              collection={collection}
              spinning={spinning}
              targetIndex={targetIndex}
              onSpinEnd={handleSpinEnd}
            />
          : <div className="text-center py-8">
              <div className="text-5xl opacity-20 mb-3">🧣</div>
              <div className="font-bebas text-2xl tracking-widest text-muted">Collection vide</div>
            </div>
        }

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
          {spinning ? '⏳ EN COURS...' : winner ? '🎲 RELANCER' : '🎲 TOURNER LA ROUE'}
        </motion.button>

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

        {history.length > 0 && (
          <motion.button
            className="w-full py-3 bg-surface border border-bord rounded-2xl font-bebas tracking-widest text-sm text-muted cursor-pointer flex items-center justify-between px-5"
            whileTap={{ scale:0.97 }}
            onClick={() => setShowHistory(!showHistory)}>
            <span>📋 HISTORIQUE ({history.length} tirages)</span>
            <span>{showHistory ? '▲' : '▼'}</span>
          </motion.button>
        )}

        <AnimatePresence>
          {showHistory && (
            <motion.div className="w-full flex flex-col gap-3"
              initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
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
              <div className="bg-surface border border-bord rounded-2xl overflow-hidden">
                <div className="text-muted text-xs uppercase tracking-widest p-4 pb-2">🕐 Derniers tirages</div>
                {history.map((h) => (
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
      </div>
    </div>
  )
}
