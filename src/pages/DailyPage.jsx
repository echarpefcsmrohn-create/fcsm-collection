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

function FortuneWheel({ collection, spinning, onSpinEnd, targetIndex }) {
  const canvasRef = useRef(null)
  const angleRef = useRef(0)
  const rafRef = useRef(null)
  const velocityRef = useRef(0)
  const n = collection.length

  const COLORS = ['#1a2d5a', '#0f1e3d', '#152244', '#0a1830']
  const ACCENT = '#F5C400'

  const draw = useCallback((angle) => {
    const canvas = canvasRef.current
    if (!canvas || n === 0) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height
    ctx.clearRect(0, 0, W, H)

    // Perspective : ellipse
    const cx = W / 2
    const cy = H * 0.52
    const rx = W * 0.44
    const ry = H * 0.18  // aplatissement perspective

    const sliceAngle = (2 * Math.PI) / n

    // Dessiner les segments
    for (let i = 0; i < n; i++) {
      const startA = angle + i * sliceAngle - Math.PI / 2
      const endA = startA + sliceAngle

      ctx.save()
      ctx.beginPath()
      ctx.moveTo(cx, cy)

      // Arc elliptique = points sur ellipse
      const steps = 20
      for (let s = 0; s <= steps; s++) {
        const a = startA + (endA - startA) * (s / steps)
        ctx.lineTo(cx + rx * Math.cos(a), cy + ry * Math.sin(a))
      }
      ctx.closePath()

      const midA = startA + sliceAngle / 2
      const sinMid = Math.sin(midA)
      // Assombrir les segments en bas (verso de la roue)
      const brightness = sinMid > 0 ? 0.5 + sinMid * 0.5 : 0.3
      ctx.fillStyle = COLORS[i % COLORS.length]
      ctx.globalAlpha = brightness
      ctx.fill()
      ctx.globalAlpha = 1

      // Bordure
      ctx.strokeStyle = 'rgba(245,196,0,0.3)'
      ctx.lineWidth = 0.8
      ctx.stroke()

      // Texte numéro — seulement si segment visible (haut de la roue)
      if (sinMid < 0.6) {
        const scarf = collection[i]
        const num = String(i + 1).padStart(3, '0')
        const textR = rx * 0.72
        const textX = cx + textR * Math.cos(midA)
        const textY = cy + ry * 0.72 * Math.sin(midA)

        ctx.save()
        ctx.translate(textX, textY)
        // Rotation du texte pour suivre la roue
        const textAngle = midA + Math.PI / 2
        ctx.rotate(textAngle)
        // Compression perspective
        ctx.scale(1, ry / rx * 0.9)

        const alpha = Math.max(0, Math.min(1, 1 - sinMid * 2))
        ctx.globalAlpha = alpha
        ctx.fillStyle = ACCENT
        ctx.font = `bold ${Math.max(8, Math.min(13, 260 / n))}px 'Bebas Neue', sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`#${num}`, 0, 0)
        ctx.globalAlpha = 1
        ctx.restore()
      }
    }

    // Cercle bord de la roue
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI)
    ctx.strokeStyle = ACCENT
    ctx.lineWidth = 2.5
    ctx.shadowColor = ACCENT
    ctx.shadowBlur = 8
    ctx.stroke()
    ctx.shadowBlur = 0

    // Centre
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx * 0.08, ry * 0.08, 0, 0, 2 * Math.PI)
    ctx.fillStyle = ACCENT
    ctx.fill()

    // Indicateur (flèche du haut)
    const arrowX = cx
    const arrowY = cy - ry - 8
    ctx.beginPath()
    ctx.moveTo(arrowX, arrowY + 18)
    ctx.lineTo(arrowX - 10, arrowY)
    ctx.lineTo(arrowX + 10, arrowY)
    ctx.closePath()
    ctx.fillStyle = ACCENT
    ctx.shadowColor = ACCENT
    ctx.shadowBlur = 10
    ctx.fill()
    ctx.shadowBlur = 0

  }, [collection, n])

  // Animation de spin
  useEffect(() => {
    if (!spinning || n === 0) return

    const sliceAngle = (2 * Math.PI) / n
    // On veut que l'index targetIndex soit sous la flèche (haut = -PI/2)
    // angle final = -(targetIndex * sliceAngle + sliceAngle/2) pour centrer le segment
    const targetAngle = -(targetIndex * sliceAngle + sliceAngle / 2)
    // On ajoute plusieurs tours complets pour l'effet de rotation
    const fullTurns = (5 + Math.floor(Math.random() * 3)) * 2 * Math.PI
    const finalAngle = targetAngle - fullTurns

    const startAngle = angleRef.current
    const totalDelta = finalAngle - startAngle
    const duration = 6000
    const start = performance.now()

    // Sons tick
    let lastTickIdx = -1

    const animate = (now) => {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)
      // Easing : accélération rapide puis freinage progressif
      const ease = t < 0.1
        ? t * 10 * 0.3
        : 0.3 + (1 - Math.pow(1 - (t - 0.1) / 0.9, 3)) * 0.7
      
      const currentAngle = startAngle + totalDelta * ease
      angleRef.current = currentAngle

      // Tick son quand on passe un segment
      const currentIdx = Math.floor((-currentAngle / (2 * Math.PI)) * n) % n
      if (currentIdx !== lastTickIdx) {
        const speed = Math.abs(totalDelta * ease / duration)
        if (t < 0.85) {
          playTick(400 + Math.random() * 300)
          vibrate([3])
        }
        lastTickIdx = currentIdx
      }

      draw(currentAngle)

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        angleRef.current = finalAngle
        draw(finalAngle)
        onSpinEnd()
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [spinning, targetIndex, n])

  // Dessin statique idle (rotation lente)
  useEffect(() => {
    if (spinning || n === 0) return
    let angle = angleRef.current
    const animate = () => {
      angle += 0.003
      angleRef.current = angle
      draw(angle)
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [spinning, n, draw])

  useEffect(() => {
    draw(angleRef.current)
  }, [collection])

  return (
    <canvas
      ref={canvasRef}
      width={340}
      height={220}
      className="w-full"
      style={{ maxWidth: 380 }}
    />
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

        {/* Roue */}
        <div className="w-full flex justify-center">
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
        </div>

        {/* Bouton */}
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

        {/* Gagnant */}
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

        {/* Historique */}
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
