import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useCollection } from '../context/CollectionContext'
import { ERAS } from '../lib/eras'
import PageHeader from '../components/PageHeader'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber'

function StatTile({ icon, label, value, delay = 0, highlight = false }) {
  const num = typeof value === 'number' ? value : null
  const animated = useAnimatedNumber(num || 0, 900)

  return (
    <motion.div
      className={`bg-surface border rounded-2xl p-5 relative overflow-hidden ${highlight ? 'border-jaune' : 'border-bord'}`}
      initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
      transition={{ delay, duration:0.4 }}>
      {highlight && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-jaune" />}
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`font-bebas text-4xl leading-none ${highlight ? 'text-jaune' : 'text-white'}`}>
        {num !== null ? animated : value}
      </div>
      <div className="text-muted text-xs uppercase tracking-widest mt-1">{label}</div>
    </motion.div>
  )
}

function AnimatedBar({ value, max, color = '#F5C400', delay = 0 }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(Math.round(value / max * 100)), delay * 1000 + 300)
    return () => clearTimeout(t)
  }, [value, max, delay])

  return (
    <div className="w-full bg-surface2 rounded-full h-2 overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        animate={{ width: `${width}%` }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </div>
  )
}

export default function StatsPage() {
  const { collection } = useCollection()
  const total = collection.length

  if (!total) return (
    <div className="pb-24">
      <PageHeader title="MES STATS" />
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="text-5xl opacity-20">📊</div>
        <div className="font-bebas text-2xl tracking-widest text-muted">Pas encore de stats</div>
      </div>
    </div>
  )

  const avecPhoto = collection.filter(s => s.photo_url).length
  const avecPrix = collection.filter(s => s.price)
  const totalPrix = avecPrix.reduce((sum, s) => sum + (s.price || 0), 0)
  const parEra = {}
  collection.forEach(s => { if (s.era) parEra[s.era] = (parEra[s.era] || 0) + 1 })
  const erasSorted = ERAS.filter(e => parEra[e.id]).sort((a, b) => (parEra[b.id] || 0) - (parEra[a.id] || 0))

  // Monthly
  const parMois = {}
  collection.forEach(s => {
    if (!s.added_at) return
    const d = new Date(s.added_at)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    parMois[key] = (parMois[key] || 0) + 1
  })
  const moisSorted = Object.entries(parMois).sort((a,b) => a[0].localeCompare(b[0]))
  const maxMois = Math.max(...moisSorted.map(([,n]) => n), 1)

  // Pie chart
  const colors = ['#F5C400','#E5A800','#D49000','#C47800','#B46000','#A44800','#943000','#842000','#741000']
  let cumAngle = 0
  const slices = erasSorted.map((e, i) => {
    const pct = (parEra[e.id] || 0) / total
    const angle = pct * 360
    const startRad = (cumAngle - 90) * Math.PI / 180
    const endRad = (cumAngle + angle - 90) * Math.PI / 180
    const cx = 60, cy = 60, r = 55
    const x1 = cx + r * Math.cos(startRad)
    const y1 = cy + r * Math.sin(startRad)
    const x2 = cx + r * Math.cos(endRad)
    const y2 = cy + r * Math.sin(endRad)
    const largeArc = angle > 180 ? 1 : 0
    const path = `M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${largeArc},1 ${x2.toFixed(1)},${y2.toFixed(1)} Z`
    cumAngle += angle
    return { path, color: colors[i % colors.length], era: e, count: parEra[e.id] }
  })

  return (
    <div className="pb-24">
      <PageHeader title="MES STATS" subtitle="FC Sochaux-Montbéliard" />
      <div className="px-4 pt-5 flex flex-col gap-4">

        {/* Key stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatTile icon="🧣" label="Écharpes" value={total} delay={0} highlight />
          <StatTile icon="📸" label="Avec photo" value={avecPhoto} delay={0.1} highlight />
          <StatTile icon="🏷" label="Ères" value={Object.keys(parEra).length} delay={0.2} />
          {avecPrix.length > 0
            ? <StatTile icon="💰" label="Valeur totale" value={`${totalPrix.toFixed(0)}€`} delay={0.3} highlight />
            : <StatTile icon="💶" label="Prix renseignés" value={0} delay={0.3} />}
        </div>

        {/* Photos bar */}
        <motion.div className="bg-surface border border-bord rounded-2xl p-5"
          initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-muted text-xs uppercase tracking-widest">📸 Photos</div>
            <div className="text-jaune font-bebas text-sm">{Math.round(avecPhoto/total*100)}%</div>
          </div>
          <div className="flex rounded-xl overflow-hidden h-8 mb-2">
            <motion.div
              className="bg-jaune flex items-center justify-center text-bleu2 text-xs font-bold"
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(avecPhoto/total*100)}%` }}
              transition={{ duration: 1, delay: 0.6, ease: 'easeOut' }}>
              {avecPhoto > 2 && avecPhoto}
            </motion.div>
            <div className="flex-1 bg-surface2 flex items-center justify-center text-muted text-xs">
              {total - avecPhoto > 0 && `${total - avecPhoto} sans`}
            </div>
          </div>
        </motion.div>

        {/* Pie chart */}
        {slices.length > 1 && (
          <motion.div className="bg-surface border border-bord rounded-2xl p-5"
            initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5 }}>
            <div className="text-muted text-xs uppercase tracking-widest mb-4">🏷 Par ère</div>
            <div className="flex items-center gap-4">
              <motion.svg width="120" height="120" viewBox="0 0 120 120" className="flex-shrink-0"
                initial={{ rotate: -90, opacity:0 }} animate={{ rotate: 0, opacity:1 }}
                transition={{ duration: 0.8, delay: 0.6 }}>
                {slices.map((s, i) => (
                  <motion.path key={i} d={s.path} fill={s.color} stroke="#080C1A" strokeWidth="1.5"
                    initial={{ opacity:0 }} animate={{ opacity:1 }}
                    transition={{ delay: 0.6 + i * 0.05 }} />
                ))}
              </motion.svg>
              <div className="flex-1 flex flex-col gap-2">
                {slices.map((s, i) => (
                  <motion.div key={i} className="flex items-center gap-2"
                    initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }}
                    transition={{ delay: 0.7 + i * 0.06 }}>
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.color }} />
                    <span className="text-muted text-xs flex-1">{s.era.label}</span>
                    <span className="text-jaune font-bold text-xs">{s.count}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Era bars */}
        {erasSorted.length > 0 && (
          <motion.div className="bg-surface border border-bord rounded-2xl p-5"
            initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.6 }}>
            <div className="text-muted text-xs uppercase tracking-widest mb-4">📊 Détail par ère</div>
            <div className="flex flex-col gap-3">
              {erasSorted.map((e, i) => (
                <div key={e.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white font-semibold">{e.label}</span>
                    <span className="text-jaune font-bold">{parEra[e.id]}</span>
                  </div>
                  <AnimatedBar value={parEra[e.id]} max={erasSorted[0] ? parEra[erasSorted[0].id] : 1}
                    color={colors[i % colors.length]} delay={i * 0.1} />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Monthly chart */}
        {moisSorted.length > 1 && (
          <motion.div className="bg-surface border border-bord rounded-2xl p-5"
            initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.7 }}>
            <div className="text-muted text-xs uppercase tracking-widest mb-4">📈 Ajouts par mois</div>
            <div className="flex items-end gap-1.5 h-24">
              {moisSorted.map(([mois, n], i) => (
                <div key={mois} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div className="text-jaune text-[0.6rem] font-bold"
                    initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: 0.8 + i * 0.05 }}>
                    {n}
                  </motion.div>
                  <motion.div className="w-full bg-jaune rounded-t-sm"
                    style={{ minHeight: '4px' }}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.round(n/maxMois*80)}%` }}
                    transition={{ duration: 0.6, delay: 0.8 + i * 0.05, ease: 'easeOut' }} />
                  <div className="text-muted text-[0.55rem]">{mois.substring(5)}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
