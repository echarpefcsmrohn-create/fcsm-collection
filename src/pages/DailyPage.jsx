import { useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection } from '../context/CollectionContext'
import { getEraLabel, getScarfNumber, getNumberMap } from '../lib/eras'
import PageHeader from '../components/PageHeader'
import EraLogo from '../components/EraLogo'
import { playTick, playWin, vibrate } from '../lib/sounds'
import { cldUrl } from '../lib/cloudinary'

const HISTORY_KEY = 'fcsm_daily_history'
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
}
function saveHistory(h) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)) } catch {}
}

// ───────────────────────── Machine à sous ─────────────────────────
// Trois rouleaux (photo, numéro, ère) qui s'arrêtent l'un après l'autre sur
// l'écharpe tirée. Le gagnant est choisi AVANT l'animation (targetIndex) : le
// dernier élément de chaque rouleau est toujours cette écharpe, donc le
// résultat affiché correspond toujours à l'écharpe réellement tirée.
const ROW_H = 96
const REELS = [
  { kind: 'photo', flex: 3, duration: 1.7 },
  { kind: 'num',   flex: 1.3, duration: 2.5 },
  { kind: 'era',   flex: 1.5, duration: 3.3 },
]

// Bande de défilement : éléments au hasard, puis le gagnant, puis un élément de fin
function buildStrip(collection, targetIdx, length) {
  const winner = collection[targetIdx]
  const others = collection.filter((_, i) => i !== targetIdx)
  const pick = () => others.length ? others[Math.floor(Math.random() * others.length)] : winner
  const strip = Array.from({ length }, pick)
  strip.push(winner)  // position length : s'arrête au centre
  strip.push(pick())  // ligne du bas
  return strip
}

function ReelCell({ kind, scarf, numberMap }) {
  if (!scarf) return <div className="font-bebas text-4xl text-jaune/60">?</div>
  if (kind === 'photo') {
    return scarf.photo_url
      ? <img src={cldUrl(scarf.photo_url, 220)} alt="" className="w-full h-full object-contain p-1" />
      : <span className="text-3xl opacity-30">🧣</span>
  }
  if (kind === 'num') {
    return <div className="font-bebas text-4xl text-jaune leading-none">{numberMap.get(scarf.id) || '---'}</div>
  }
  return (
    <div className="flex flex-col items-center gap-1 px-1">
      <EraLogo id={scarf.era} size={34} />
      <div className="label-retro text-[0.58rem] text-argent text-center leading-tight">{getEraLabel(scarf.era) || '—'}</div>
    </div>
  )
}

function SlotMachine({ collection, spinning, spinId, targetIndex, onSpinEnd }) {
  const numberMap = getNumberMap(collection)
  const strips = useMemo(() => {
    if (!spinId) return null
    return REELS.map((r, i) => buildStrip(collection, targetIndex, 10 + i * 7))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinId])

  // Bruit de tic pendant que les rouleaux tournent
  useEffect(() => {
    if (!spinning) return
    const t = setInterval(() => playTick(), 110)
    return () => clearInterval(t)
  }, [spinning])

  return (
    <div className="w-full max-w-xs relative">
      {/* Fronton */}
      <div className="bg-jaune text-noir text-center py-2 border-[3px] border-creme border-b-0">
        <div className="font-bebas text-2xl leading-none uppercase" style={{ transform: 'skewX(-8deg)' }}>Écharpe du jour</div>
      </div>
      {/* Fenêtre des rouleaux */}
      <div className="relative flex border-[3px] border-creme bg-surface overflow-hidden" style={{ height: ROW_H * 3 }}>
        {REELS.map((r, ri) => {
          const strip = strips ? strips[ri] : null
          const finalY = strip ? -((strip.length - 3) * ROW_H) : 0
          return (
            <div key={r.kind} className={`relative overflow-hidden ${ri > 0 ? 'border-l-[3px] border-creme' : ''}`} style={{ flex: r.flex }}>
              <motion.div
                key={spinId}
                initial={{ y: 0 }}
                animate={{ y: finalY }}
                transition={{ duration: spinId ? r.duration : 0, ease: [0.25, 0.9, 0.3, 1] }}
                onAnimationComplete={() => { if (spinId && ri === REELS.length - 1) onSpinEnd() }}>
                {(strip || [null, null, null]).map((sc, i) => (
                  <div key={i} className="flex items-center justify-center overflow-hidden border-b border-bord/50" style={{ height: ROW_H }}>
                    <ReelCell kind={r.kind} scarf={sc} numberMap={numberMap} />
                  </div>
                ))}
              </motion.div>
            </div>
          )
        })}
        {/* Fondus haut/bas : seule la ligne centrale est « jouée » */}
        <div className="absolute left-0 right-0 top-0 pointer-events-none bg-gradient-to-b from-surface via-surface/70 to-transparent" style={{ height: ROW_H * 0.9 }} />
        <div className="absolute left-0 right-0 bottom-0 pointer-events-none bg-gradient-to-t from-surface via-surface/70 to-transparent" style={{ height: ROW_H * 0.9 }} />
        {/* Ligne de tirage */}
        <div className="absolute left-0 right-0 pointer-events-none" style={{ top: ROW_H, height: ROW_H, borderTop: '3px solid #D6362B', borderBottom: '3px solid #D6362B' }} />
        <div className="absolute pointer-events-none" style={{ left: 0, top: ROW_H * 1.5 - 10, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderLeft: '14px solid #FFC800' }} />
        <div className="absolute pointer-events-none" style={{ right: 0, top: ROW_H * 1.5 - 10, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderRight: '14px solid #FFC800' }} />
      </div>
      {/* Socle à ampoules */}
      <div className="bg-jaune border-[3px] border-creme border-t-0 py-1.5 flex justify-center gap-2.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <motion.span key={i} className="w-2 h-2 rounded-full bg-noir"
            animate={spinning ? { opacity: i % 2 ? [1, 0.2, 1] : [0.2, 1, 0.2] } : { opacity: 0.8 }}
            transition={{ duration: 0.5, repeat: spinning ? Infinity : 0 }} />
        ))}
      </div>
    </div>
  )
}

export default function DailyPage() {
  const { collection } = useCollection()
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState(null)
  const [targetIndex, setTargetIndex] = useState(0)
  const [spinId, setSpinId] = useState(0)
  const [history, setHistory] = useState(loadHistory)
  const [showHistory, setShowHistory] = useState(false)

  const spin = useCallback(() => {
    if (spinning || !collection.length) return
    setWinner(null)
    setSpinning(true)
    const idx = Math.floor(Math.random() * collection.length)
    setTargetIndex(idx)
    setSpinId(n => n + 1)
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
      <PageHeader title="ÉCHARPE DU JOUR" subtitle="Laisse le hasard choisir" />
      <div className="px-4 pt-4 flex flex-col items-center gap-5">

        {collection.length > 0
          ? <SlotMachine
              collection={collection}
              spinning={spinning}
              spinId={spinId}
              targetIndex={targetIndex}
              onSpinEnd={handleSpinEnd}
            />
          : <div className="text-center py-8">
              <div className="text-5xl opacity-20 mb-3">🧣</div>
              <div className="font-bebas text-2xl tracking-widest text-muted">Collection vide</div>
            </div>
        }

        <motion.button
          className={`w-full max-w-xs py-4 font-bebas text-3xl uppercase cursor-pointer disabled:opacity-60 border-[3px] border-creme ${spinning ? 'bg-surface text-argent' : 'bg-defaite text-white ombre-dure'}`}
          whileTap={{ scale: 0.96 }}
          onClick={spin}
          disabled={spinning || !collection.length}>
          {spinning ? 'Ça tourne…' : winner ? 'Relancer' : 'Tirer le levier'}
        </motion.button>

        <AnimatePresence>
          {winner && (
            <motion.div className="w-full overflow-hidden border-[3px] border-creme"
              initial={{ opacity:0, scale:0.9, y:20 }}
              animate={{ opacity:1, scale:1, y:0 }}
              exit={{ opacity:0 }}
              transition={{ type:'spring', damping:20, stiffness:300 }}>
              <div className="aspect-[3/2] bg-surface2 flex items-center justify-center overflow-hidden">
                {winner.photo_url
                  ? <img src={cldUrl(winner.photo_url, 800)} alt={winner.Name} className="w-full h-full object-contain" />
                  : <span className="text-8xl opacity-10">🧣</span>}
              </div>
              <div className="text-center py-4 px-5 bg-jaune border-t-[3px] border-creme">
                <div className="inline-block bg-noir text-jaune font-bebas text-3xl leading-none px-3 py-1 mb-2" style={{ transform: 'rotate(-3deg)' }}>{getScarfNumber(winner, collection)}</div>
                <div className="titre-retro text-3xl text-noir leading-none" style={{ transformOrigin: 'center' }}>{winner.Name}</div>
                {winner.era && <div className="label-retro text-noir/80 text-[0.62rem] mt-1.5">{getEraLabel(winner.era)}</div>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {history.length > 0 && (
          <motion.button
            className="w-full py-3 bg-surface border-[3px] border-creme  font-bebas tracking-widest text-sm text-muted cursor-pointer flex items-center justify-between px-5"
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
                <div className="bg-surface border-[3px] border-creme  p-4">
                  <div className="text-muted text-xs uppercase tracking-widest mb-3">🏆 Les plus tirées</div>
                  {topScarves.map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between py-1.5 border-b border-bord last:border-0">
                      <span className="text-sm truncate flex-1 mr-2">{name}</span>
                      <span className="font-bebas text-jaune text-base">{count}x</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="bg-surface border-[3px] border-creme  overflow-hidden">
                <div className="text-muted text-xs uppercase tracking-widest p-4 pb-2">🕐 Derniers tirages</div>
                {history.map((h) => (
                  <motion.div key={h.id}
                    className="flex items-center gap-3 px-4 py-3 border-t border-bord"
                    initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0, x:-20 }}>
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface2 flex-shrink-0">
                      {h.photo
                        ? <img src={cldUrl(h.photo, 120)} alt="" className="w-full h-full object-cover" />
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
