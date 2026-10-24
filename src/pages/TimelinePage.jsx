import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useCollection } from '../context/CollectionContext'
import { ERAS, normalizeEra, getNumberMap } from '../lib/eras'
import { cldUrl } from '../lib/cloudinary'
import { getResult, RETRO_BADGE, formatScoreFcsm } from '../lib/match'
import PageHeader from '../components/PageHeader'
import EraLogo from '../components/EraLogo'
import ScarfDetail from '../components/ScarfDetail'

/**
 * Frise chronologique : une étape par ère, dans l'ordre de ERAS, avec le logo
 * du club de l'époque et les écharpes correspondantes. Les ères vides restent
 * visibles (en creux) : on voit tout de suite les périodes à compléter.
 * Les numéros affichés viennent de getNumberMap, comme partout ailleurs.
 */
export default function TimelinePage() {
  const { collection, loading } = useCollection()
  const [selected, setSelected] = useState(null)
  const [selectedList, setSelectedList] = useState([])

  const numbers = useMemo(() => getNumberMap(collection), [collection])

  const steps = useMemo(() => {
    const byEra = {}
    for (const s of collection) {
      const id = normalizeEra(s.era)
      ;(byEra[id] ||= []).push(s)
    }
    return ERAS.map(e => {
      const list = (byEra[e.id] || []).slice().sort((a, b) =>
        new Date(a.match_date || a.added_at) - new Date(b.match_date || b.added_at))
      const prix = list.reduce((t, s) => t + (Number(s.price) || 0), 0)
      const matchs = list.filter(s => s.is_match).length
      return { era: e, list, prix, matchs }
    })
  }, [collection])

  const open = (scarf, list) => { setSelected(scarf); setSelectedList(list) }
  const move = (d) => {
    const i = selectedList.findIndex(s => s.id === selected.id) + d
    if (i >= 0 && i < selectedList.length) setSelected(selectedList[i])
  }

  const total = collection.length
  const erasRemplies = steps.filter(s => s.list.length && s.era.id !== 'inconnue').length
  const erasTotal = ERAS.length - 1

  return (
    <div className="pb-24">
      <PageHeader title="FRISE" subtitle={loading ? '...' : `${erasRemplies} ère${erasRemplies > 1 ? 's' : ''} sur ${erasTotal} · ${total} écharpes`} />

      <div className="px-4 pt-5 relative">
        {/* Ligne du temps */}
        <div className="absolute top-5 bottom-0 left-[1.65rem] w-[4px] pointer-events-none"
          style={{ background: 'repeating-linear-gradient(to bottom, #FFC800 0 10px, transparent 10px 16px)' }} />

        {steps.map(({ era, list, prix, matchs }, idx) => {
          const vide = list.length === 0
          if (vide && era.id === 'inconnue') return null
          return (
            <motion.section key={era.id} className="relative pl-14 pb-7"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: Math.min(idx, 6) * 0.03, duration: 0.15 }}>
              {/* Étape : carré avec logo */}
              <div className={`absolute left-0 top-0 w-[3.3rem] h-[3.3rem] flex items-center justify-center border-[3px] ${vide ? 'border-bord bg-noir' : 'border-creme bg-surface'}`}>
                <div style={{ opacity: vide ? 0.35 : 1, filter: vide ? 'grayscale(1)' : 'none' }}>
                  <EraLogo id={era.id} size={34} />
                </div>
              </div>

              <div className="flex items-end justify-between gap-2 min-h-[3.3rem]">
                <div>
                  <div className={`titre-retro text-3xl leading-none ${vide ? 'text-argent/40' : 'text-white'}`}>{era.label}</div>
                  <div className="label-retro text-[0.58rem] text-argent/70 mt-1.5">
                    {vide
                      ? 'Aucune écharpe'
                      : `${list.length} écharpe${list.length > 1 ? 's' : ''}${matchs ? ` · ${matchs} match${matchs > 1 ? 's' : ''}` : ''}${prix ? ` · ${Math.round(prix)} €` : ''}`}
                  </div>
                </div>
              </div>

              {vide ? (
                <div className="mt-3 border-[3px] border-dashed border-bord px-3 py-4 label-retro text-[0.58rem] text-argent/40 text-center">
                  Période à compléter
                </div>
              ) : (
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar mt-3 pb-1 -mr-4 pr-4">
                  {list.map(s => <TimelineThumb key={s.id} scarf={s} num={numbers.get(String(s.id))} onClick={() => open(s, list)} />)}
                </div>
              )}
            </motion.section>
          )
        })}
      </div>

      {selected && (
        <ScarfDetail
          scarf={selected}
          onClose={() => setSelected(null)}
          onPrev={() => move(-1)}
          onNext={() => move(1)}
        />
      )}
    </div>
  )
}

function TimelineThumb({ scarf, num, onClick }) {
  const key = getResult(scarf)
  const badge = key ? RETRO_BADGE[key] : null
  const score = formatScoreFcsm(scarf)
  return (
    <button onClick={onClick} className="flex-shrink-0 w-[6.2rem] text-left cursor-pointer bg-creme text-noir border-[3px] border-creme">
      <div className="relative aspect-square bg-surface flex items-center justify-center overflow-hidden">
        {scarf.photo_url
          ? <img src={cldUrl(scarf.photo_url, 200)} alt={scarf.Name} loading="lazy"
              className="w-full h-full object-contain p-1" />
          : <span className="text-2xl opacity-20">🧣</span>}
        <div className="absolute top-0 left-0 bg-jaune text-noir font-bebas text-base leading-none px-1.5 py-0.5">{num}</div>
        {badge && score && (
          <div className="absolute bottom-0 right-0 px-1 py-0.5 label-retro text-[0.5rem]"
            style={{ background: badge.bg, color: badge.color }}>{score}</div>
        )}
      </div>
      <div className="px-1.5 py-1 border-t-[3px] border-noir text-[0.62rem] font-bold truncate">{scarf.Name}</div>
    </button>
  )
}
