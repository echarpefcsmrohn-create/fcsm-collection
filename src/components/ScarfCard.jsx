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
      <div className="aspect-[4/3] overflow-hidden flex items-center justify-center relative"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 50%, #0a1628 100%)' }}>
        {photo
          ? <img src={photo} alt={scarf.Name}
              className="w-full h-full"
              loading="lazy"
              style={{ objectFit: 'contain', padding: '4px', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.6))' }} />
          : <span className="text-4xl opacity-20">🧣</span>}
        {/* Subtle gold shimmer overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(245,196,0,0.04) 0%, transparent 70%)' }} />
        {scarf.era && (
          <div className="absolute top-1.5 left-1.5 bg-noir/80 border border-jaune/40 rounded-md px-1.5 py-0.5 text-jaune text-[0.58rem] font-bold backdrop-blur-sm">
            {eraLabel}
          </div>
        )}
      </div>
      <div className="p-2.5 pb-3 bg-surface">
        <div className="text-jaune font-bebas text-xs tracking-wide opacity-70">#{num}</div>
        <div className="text-sm font-semibold truncate text-white leading-tight">{scarf.Name}</div>
        <div className="text-[0.7rem] text-muted mt-0.5">
          {scarf.price ? `${scarf.price} €` : eraLabel || '—'}
        </div>
      </div>
    </motion.div>
  )
}
