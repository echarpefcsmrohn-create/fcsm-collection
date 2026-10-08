import { memo } from 'react'
import { motion } from 'framer-motion'
import { getEraLabel, getScarfNumber } from '../lib/eras'
import { useCollection } from '../context/CollectionContext'
import { cldUrl } from '../lib/cloudinary'
import { getResultStyle, formatScoreFcsm } from '../lib/match'

function ScarfCard({ scarf, onClick }) {
  const { collection } = useCollection()
  const num = getScarfNumber(scarf, collection)
  const eraLabel = getEraLabel(scarf.era)
  const photo = scarf.photo_url
  const result = getResultStyle(scarf)
  const score = formatScoreFcsm(scarf)

  return (
    <motion.div
      className="scarf-card bg-creme text-noir border-[3px] border-creme overflow-hidden cursor-pointer"
      whileTap={{ scale: 0.95 }}
      onClick={() => onClick(scarf)}
    >
      <div className="aspect-[4/3] overflow-hidden flex items-center justify-center relative bg-surface">
        {photo
          ? <img src={cldUrl(photo, 400)} alt={scarf.Name}
              className="w-full h-full"
              loading="lazy"
              style={{ objectFit: 'contain', padding: '4px', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))' }} />
          : <span className="text-4xl opacity-20">🧣</span>}
        {/* Numéro : badge jaune, repère principal de la collection */}
        <div className="absolute top-0 left-0 bg-jaune text-noir font-bebas text-2xl leading-none px-2.5 py-1">
          {num}
        </div>
        {result && score && (
          <div
            className="absolute top-1.5 right-1.5 px-1.5 py-0.5 label-retro text-[0.62rem]"
            style={{ background: result.bg, border: `2px solid ${result.border}`, color: result.color }}>
            {score}
          </div>
        )}
      </div>
      <div className="px-2.5 py-2 border-t-[3px] border-noir">
        <div className="text-[0.8rem] font-bold truncate leading-tight">{scarf.Name}</div>
        <div className="label-retro text-[0.58rem] opacity-70 mt-0.5 truncate">
          {scarf.price ? `${scarf.price} €` : eraLabel || '—'}
        </div>
      </div>
    </motion.div>
  )
}

// Évite de re-rendre les 100 cartes quand seule une partie change.
export default memo(ScarfCard, (prev, next) =>
  prev.scarf.id === next.scarf.id &&
  prev.scarf.Name === next.scarf.Name &&
  prev.scarf.era === next.scarf.era &&
  prev.scarf.price === next.scarf.price &&
  prev.scarf.photo_url === next.scarf.photo_url &&
  prev.scarf.is_match === next.scarf.is_match &&
  prev.scarf.score_fcsm === next.scarf.score_fcsm &&
  prev.scarf.score_opponent === next.scarf.score_opponent
)
