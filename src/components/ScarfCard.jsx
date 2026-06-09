import { motion } from 'framer-motion'
import { getEraLabel, getScarfNumber } from '../lib/eras'
import { useCollection } from '../context/CollectionContext'

export default function ScarfCard({ scarf, onClick }) {
  const { collection } = useCollection()
  const num = getScarfNumber(scarf, collection)
  const eraLabel = getEraLabel(scarf.era)
  const photo = scarf.photo_url

  return (
    <motion.div
      className="scarf-card bg-surface border border-bord rounded-2xl overflow-hidden cursor-pointer"
      whileTap={{ scale: 0.95 }}
      whileHover={{ borderColor: 'rgba(245,196,0,0.5)', y: -2 }}
      onClick={() => onClick(scarf)}
      layout
    >
      <div className="aspect-[4/3] bg-surface2 overflow-hidden flex items-center justify-center relative">
        {photo
          ? <img src={photo} alt={scarf.Name} className="w-full h-full object-cover" loading="lazy" />
          : <span className="text-4xl opacity-20">🧣</span>}
        {scarf.era && (
          <div className="absolute top-1.5 left-1.5 bg-noir/75 border border-jaune/50 rounded px-1.5 py-0.5 text-jaune text-[0.58rem] font-bold backdrop-blur-sm">
            {eraLabel}
          </div>
        )}
      </div>
      <div className="p-2.5 pb-3">
        <div className="text-jaune font-bebas text-xs tracking-wide">#{num}</div>
        <div className="text-sm font-semibold truncate text-white">{scarf.Name}</div>
        <div className="text-[0.7rem] text-muted mt-0.5">
          {scarf.price ? `${scarf.price} €` : eraLabel || '—'}
        </div>
      </div>
    </motion.div>
  )
}
