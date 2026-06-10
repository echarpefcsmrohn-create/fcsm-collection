import { useCollection } from '../context/CollectionContext'
import { ERAS } from '../lib/eras'
import PageHeader from '../components/PageHeader'

export default function StatsPage() {
  const { collection } = useCollection()
  const total = collection.length
  if (!total) return (
    <div className="pb-24">
      <PageHeader title="MES STATS" subtitle="Football Club Sochaux-Montbéliard" />
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="text-5xl opacity-20">📊</div>
        <div className="font-bebas text-2xl tracking-widest text-muted">Pas encore de stats</div>
      </div>
    </div>
  )

  const avecPhoto = collection.filter(s => s.photo_url).length
  const avecPrix = collection.filter(s => s.price)
  const totalPrix = avecPrix.reduce((sum,s) => sum + (s.price||0), 0)
  const parEra = {}
  collection.forEach(s => { if(s.era) parEra[s.era] = (parEra[s.era]||0)+1 })
  const erasSorted = ERAS.filter(e => parEra[e.id]).sort((a,b) => (parEra[b.id]||0)-(parEra[a.id]||0))

  // Monthly evolution
  const parMois = {}
  collection.forEach(s => {
    if (!s.added_at) return
    const d = new Date(s.added_at)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    parMois[key] = (parMois[key]||0)+1
  })
  const moisSorted = Object.entries(parMois).sort((a,b) => a[0].localeCompare(b[0]))
  const maxMois = Math.max(...moisSorted.map(([,n]) => n), 1)

  // Pie chart SVG
  const colors = ['#F5C400','#E5A800','#D49000','#C47800','#B46000','#A44800','#943000','#842000','#741000']
  let cumAngle = 0
  const slices = erasSorted.map((e, i) => {
    const pct = (parEra[e.id]||0) / total
    const angle = pct * 360
    const startRad = (cumAngle - 90) * Math.PI / 180
    const endRad = (cumAngle + angle - 90) * Math.PI / 180
    const cx=60, cy=60, r=55
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
      <PageHeader title="MES STATS" subtitle="Football Club Sochaux-Montbéliard" />
      <div className="px-4 pt-5 flex flex-col gap-4">

        {/* Key numbers */}
        <div className="bg-surface border border-bord rounded-2xl p-5 border-t-4 border-t-jaune">
          <div className="text-muted text-xs uppercase tracking-widest mb-4">Collection</div>
          {[
            { icon:'🧣', label:'Total écharpes', val: total },
            { icon:'📸', label:'Avec photo', val: `${avecPhoto} (${Math.round(avecPhoto/total*100)}%)` },
            { icon:'🏷', label:'Ères représentées', val: Object.keys(parEra).length },
            ...(avecPrix.length ? [
              { icon:'💰', label:'Valeur totale', val: `${totalPrix.toFixed(2)} €` },
              { icon:'💶', label:'Écharpes avec prix', val: `${avecPrix.length} / ${total}` },
            ] : [])
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-bord last:border-0">
              <span className="text-muted text-sm">{row.icon} {row.label}</span>
              <span className="text-jaune font-bold text-sm">{row.val}</span>
            </div>
          ))}
        </div>

        {/* Photo bar */}
        <div className="bg-surface border border-bord rounded-2xl p-5 border-t-4 border-t-jaune">
          <div className="text-muted text-xs uppercase tracking-widest mb-4">📸 Photos</div>
          <div className="flex rounded-xl overflow-hidden h-8 mb-3">
            <div className="bg-jaune flex items-center justify-center text-bleu2 text-xs font-bold transition-all duration-1000"
              style={{ width: `${Math.round(avecPhoto/total*100)}%` }}>
              {avecPhoto > 0 && avecPhoto}
            </div>
            <div className="flex-1 bg-surface2 flex items-center justify-center text-muted text-xs">
              {total - avecPhoto > 0 && `${total - avecPhoto} sans photo`}
            </div>
          </div>
        </div>

        {/* Pie chart */}
        {slices.length > 1 && (
          <div className="bg-surface border border-bord rounded-2xl p-5 border-t-4 border-t-jaune">
            <div className="text-muted text-xs uppercase tracking-widest mb-4">🏷 Par ère</div>
            <div className="flex items-center gap-5">
              <svg width="120" height="120" viewBox="0 0 120 120" className="flex-shrink-0">
                {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke="#080C1A" strokeWidth="1.5" />)}
              </svg>
              <div className="flex-1 flex flex-col gap-1.5">
                {slices.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.color }} />
                    <span className="text-muted text-xs flex-1">{s.era.label}</span>
                    <span className="text-jaune font-bold text-xs">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Monthly chart */}
        {moisSorted.length > 1 && (
          <div className="bg-surface border border-bord rounded-2xl p-5 border-t-4 border-t-jaune">
            <div className="text-muted text-xs uppercase tracking-widest mb-4">📈 Ajouts par mois</div>
            <div className="flex items-end gap-1.5 h-20">
              {moisSorted.map(([mois, n]) => (
                <div key={mois} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-jaune text-[0.6rem] font-bold">{n}</div>
                  <div className="w-full bg-jaune rounded-t-sm" style={{ height: `${Math.round(n/maxMois*100)}%`, minHeight: '4px' }} />
                  <div className="text-muted text-[0.55rem]">{mois.substring(5)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
