import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getEraLabel, getScarfNumber } from '../lib/eras'
import { useCollection } from '../context/CollectionContext'
import { cldUrl } from '../lib/cloudinary'

export default function PresentationMode({ scarves, onClose }) {
  const { collection } = useCollection()
  const [idx, setIdx] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const total = scarves.length
  const scarf = scarves[idx]
  if (!scarf) return null

  const go = (dir) => {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= total) return
    setIdx(newIdx)
  }

  return (
    <motion.div className="fixed inset-0 bg-black z-[400] flex flex-col"
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>

      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <motion.button onClick={onClose} whileTap={{ scale:0.9 }}
          className="w-10 h-10 border-[3px] border-creme bg-transparent text-white flex items-center justify-center cursor-pointer">
          ✕
        </motion.button>
        <div className="font-bebas text-argent/50 tracking-widest text-sm">{idx+1} / {total}</div>
        <div className="w-10" />
      </div>

      {/* Photo */}
      <div className="flex-1 flex items-center justify-center p-5 pt-20 pb-4 cursor-zoom-in"
        onClick={() => scarf.photo_url && setLightbox(true)}>
        <AnimatePresence mode="wait">
          <motion.div key={idx} className="w-full h-full flex items-center justify-center"
            initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.95 }}
            transition={{ duration:0.25 }}>
            {scarf.photo_url
              ? <img src={cldUrl(scarf.photo_url, 1200)} alt={scarf.Name} className="max-w-full max-h-full object-contain"
                  style={{ filter:'drop-shadow(0 0 30px rgba(255,200,0,0.12))' }} />
              : <span className="text-9xl opacity-10">🧣</span>}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Plaque dorée */}
      <AnimatePresence mode="wait">
        <motion.div key={idx}
          className="mx-5 mb-4 text-center py-3 px-5 bg-jaune border-[3px] border-creme"
          initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
          <div className="inline-block bg-noir text-jaune font-bebas text-2xl leading-none px-2.5 py-0.5 mb-1.5" style={{ transform:'rotate(-3deg)' }}>
            {getScarfNumber(scarf, collection)}
          </div>
          <div className="titre-retro text-2xl text-noir leading-none" style={{ transformOrigin:'center' }}>{scarf.Name}</div>
          {scarf.era && (
            <div className="label-retro text-noir/80 text-[0.6rem] mt-1.5">{getEraLabel(scarf.era)}</div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Nav */}
      <div className="flex items-center justify-between px-6 pb-8 pt-2">
        <motion.button onClick={() => go(-1)} disabled={idx===0} whileTap={{ scale:0.9 }}
          className="w-12 h-12 border-[3px] border-jaune bg-transparent text-jaune text-xl flex items-center justify-center cursor-pointer disabled:opacity-15">
          ←
        </motion.button>
        <div className="flex gap-1.5 flex-wrap justify-center max-w-[160px]">
          {Array.from({ length: Math.min(total, 9) }).map((_, i) => (
            <div key={i} className={`rounded-full transition-all ${i===idx ? 'bg-jaune w-4 h-1.5' : 'bg-jaune/20 w-1.5 h-1.5'}`} />
          ))}
          {total > 9 && <span className="text-jaune/30 text-[0.6rem]">+{total-9}</span>}
        </div>
        <motion.button onClick={() => go(1)} disabled={idx===total-1} whileTap={{ scale:0.9 }}
          className="w-12 h-12 border-[3px] border-jaune bg-transparent text-jaune text-xl flex items-center justify-center cursor-pointer disabled:opacity-15">
          →
        </motion.button>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div className="fixed inset-0 bg-black/95 z-[500] flex items-center justify-center p-4"
            onClick={() => setLightbox(false)}
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <img src={cldUrl(scarf.photo_url, 1200)} alt="" className="max-w-full max-h-full object-contain" />
            <button className="absolute top-4 right-4 w-10 h-10 border-[3px] border-creme bg-transparent text-white flex items-center justify-center cursor-pointer">✕</button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
