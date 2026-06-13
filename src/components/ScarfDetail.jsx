import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection } from '../context/CollectionContext'
import { getEraLabel, getScarfNumber, ERAS } from '../lib/eras'
import { uploadToCloudinary, removeBackground } from '../lib/cloudinary'
import { playDelete, vibrate } from '../lib/sounds'

export default function ScarfDetail({ scarf, onClose, onPrev, onNext }) {
  const { collection, update, remove } = useCollection()
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(scarf.Name)
  const [editEra, setEditEra] = useState(scarf.era)
  const [editPrice, setEditPrice] = useState(scarf.price || '')
  const [saving, setSaving] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const [reprocessing, setReprocessing] = useState(false)
  const [reprocessStep, setReprocessStep] = useState('')
  const touchStartX = useRef(null)

  const num = getScarfNumber(scarf, collection)
  const eraLabel = getEraLabel(scarf.era)
  const photo = scarf.photo_url
  const currentScarf = collection.find(s => String(s.id) === String(scarf.id)) || scarf
  const currentPhoto = currentScarf.photo_url

  const handleSave = async () => {
    setSaving(true)
    try {
      await update(scarf.id, {
        Name: editName,
        era: editEra || null,
        price: editPrice ? parseFloat(editPrice) : null
      })
      setEditing(false)
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirm('Supprimer cette écharpe ?')) return
    vibrate([50, 30, 50])
    playDelete()
    await remove(scarf.id)
    onClose()
  }

  const [rotating, setRotating] = useState(false)
  const [rotation, setRotation] = useState(0)

  const handleRotate = async () => {
    if (!currentPhoto || rotating) return
    setRotating(true)
    try {
      // Rotate image 90 degrees
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = currentPhoto
      })
      const canvas = document.createElement('canvas')
      canvas.width = img.height
      canvas.height = img.width
      const ctx = canvas.getContext('2d')
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate(90 * Math.PI / 180)
      ctx.drawImage(img, -img.width / 2, -img.height / 2)
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'))
      const file = new File([blob], 'rotated.png', { type: 'image/png' })
      const url = await uploadToCloudinary(file)
      await update(scarf.id, { photo_url: url })
      setRotation(r => r + 90)
    } catch(e) {
      console.error(e)
    }
    setRotating(false)
  }

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 60) {
      if (diff > 0 && onNext) onNext()
      else if (diff < 0 && onPrev) onPrev()
    }
    touchStartX.current = null
  }

  const handleReprocess = async () => {
    if (!currentPhoto) return
    setReprocessing(true)
    setReprocessStep('⏳ Récupération de la photo...')
    try {
      const r = await fetch(currentPhoto)
      const blob = await r.blob()
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' })
      setReprocessStep('🪄 Détourage en cours...')
      const nobg = await removeBackground(file)
      setReprocessStep('📤 Upload...')
      const url = await uploadToCloudinary(nobg)
      await update(scarf.id, { photo_url: url })
      setReprocessStep('✅ Photo détourée !')
      setTimeout(() => setReprocessStep(''), 2000)
    } catch (e) {
      setReprocessStep('❌ Erreur : ' + e.message)
      setTimeout(() => setReprocessStep(''), 3000)
    }
    setReprocessing(false)
  }

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 bg-noir z-[300] overflow-y-auto no-scrollbar"
        initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:30 }}
        transition={{ type:'spring', damping:25, stiffness:300 }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}>

        {/* Top buttons */}
        <div className="fixed top-safe top-4 left-4 z-20 flex gap-2">
          <motion.button onClick={onClose} whileTap={{ scale:0.9 }}
            className="w-10 h-10 rounded-full bg-noir/80 border border-jaune text-jaune text-lg flex items-center justify-center cursor-pointer backdrop-blur-sm">
            ←
          </motion.button>
        </div>
        <div className="fixed top-4 right-4 z-20 flex gap-2">
          <motion.button onClick={handleRotate} disabled={rotating} whileTap={{ scale:0.9 }}
            title="Pivoter la photo"
            className="w-10 h-10 rounded-full bg-noir/80 border border-jaune/50 text-jaune flex items-center justify-center cursor-pointer backdrop-blur-sm disabled:opacity-50">
            {rotating
              ? <div className="w-4 h-4 border-2 border-jaune/30 border-t-jaune rounded-full animate-spin-slow" />
              : '🔄'}
          </motion.button>
          <motion.button onClick={() => setEditing(!editing)} whileTap={{ scale:0.9 }}
            className={`w-10 h-10 rounded-full border flex items-center justify-center cursor-pointer backdrop-blur-sm ${editing ? 'bg-jaune border-jaune text-bleu2' : 'bg-noir/80 border-jaune text-jaune'}`}>
            ✏️
          </motion.button>
          <motion.button onClick={handleDelete} whileTap={{ scale:0.9 }}
            className="w-10 h-10 rounded-full bg-noir/80 border border-red-500 text-red-400 flex items-center justify-center cursor-pointer backdrop-blur-sm">
            🗑
          </motion.button>
        </div>

        {/* Photo */}
        <div className="aspect-[4/3] bg-surface2 flex items-center justify-center overflow-hidden relative cursor-zoom-in"
          onClick={() => currentPhoto && setLightbox(true)}>
          {currentPhoto
            ? <img src={currentPhoto} alt={scarf.Name} className="w-full h-full object-cover" />
            : <span className="text-8xl opacity-10">🧣</span>}
        </div>

        {/* Info */}
        <div className="p-5">
          {editing ? (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-muted text-xs uppercase tracking-widest mb-2 block">Nom</label>
                <input className="w-full bg-surface2 border border-bord rounded-xl px-4 py-3 text-white outline-none focus:border-jaune text-sm"
                  value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div>
                <label className="text-muted text-xs uppercase tracking-widest mb-2 block">Ère</label>
                <div className="grid grid-cols-3 gap-2">
                  {ERAS.map(e => (
                    <button key={e.id} onClick={() => setEditEra(e.id)}
                      className={`py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${editEra === e.id ? 'bg-jaune/15 border-jaune text-jaune' : 'bg-surface2 border-bord text-muted'}`}>
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-muted text-xs uppercase tracking-widest mb-2 block">Prix (€)</label>
                <input type="number" className="w-full bg-surface2 border border-bord rounded-xl px-4 py-3 text-white outline-none focus:border-jaune text-sm"
                  value={editPrice} onChange={e => setEditPrice(e.target.value)} placeholder="ex: 15" />
              </div>
              <motion.button onClick={handleSave} disabled={saving} whileTap={{ scale:0.97 }}
                className="w-full py-4 bg-jaune text-bleu2 font-bebas text-xl tracking-widest rounded-2xl cursor-pointer disabled:opacity-50">
                {saving ? 'SAUVEGARDE...' : 'ENREGISTRER'}
              </motion.button>
            </div>
          ) : (
            <>
              <div className="font-bebas text-3xl tracking-widest text-jaune leading-tight">{currentScarf.Name || scarf.Name}</div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {(currentScarf.era || scarf.era) && (
                  <div className="bg-jaune/10 border border-jaune/30 rounded-lg px-3 py-1 text-jaune text-xs font-semibold">
                    🏷 {getEraLabel(currentScarf.era || scarf.era)}
                  </div>
                )}
                <div className="bg-surface2 border border-bord rounded-lg px-3 py-1 text-argent text-xs font-bebas">
                  #{num}
                </div>
              </div>
              <div className="mt-2 text-muted text-xs">
                Ajoutée le {new Date(scarf.added_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })}
              </div>

              <div className="mt-4 bg-surface border border-bord rounded-2xl p-4 space-y-3">
                <div className="text-muted text-xs uppercase tracking-widest">Infos</div>
                {[
                  { label:'📸 Photo', val: currentPhoto ? 'Oui' : 'Non' },
                  { label:'🏷 Ère', val: getEraLabel(currentScarf.era || scarf.era) || 'Non renseignée' },
                  ...(currentScarf.price || scarf.price ? [{ label:'💰 Prix payé', val: `${currentScarf.price || scarf.price} €` }] : [])
                ].map((row, i) => (
                  <div key={i} className="flex justify-between items-center text-sm border-b border-bord last:border-0 pb-2 last:pb-0">
                    <span className="text-muted">{row.label}</span>
                    <span className="font-semibold text-jaune">{row.val}</span>
                  </div>
                ))}
              </div>

              {currentPhoto && (
                <motion.button onClick={handleReprocess} disabled={reprocessing} whileTap={{ scale:0.97 }}
                  className="mt-4 w-full py-3 bg-surface2 border border-jaune/40 text-jaune font-bebas tracking-widest rounded-2xl cursor-pointer disabled:opacity-50 text-sm flex items-center justify-center gap-2">
                  {reprocessing
                    ? <><div className="w-4 h-4 border-2 border-jaune/30 border-t-jaune rounded-full animate-spin-slow" />{reprocessStep}</>
                    : reprocessStep || '🪄 DÉTOURER LA PHOTO'}
                </motion.button>
              )}
            </>
          )}
        </div>

        {/* Lightbox */}
        <AnimatePresence>
          {lightbox && (
            <motion.div className="fixed inset-0 bg-black/95 z-[400] flex items-center justify-center p-4"
              onClick={() => setLightbox(false)}
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
              <img src={currentPhoto} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
              <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center text-lg cursor-pointer">✕</button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}
