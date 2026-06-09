import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection } from '../context/CollectionContext'
import { ERAS } from '../lib/eras'
import { uploadPhoto, removeBackground } from '../lib/cloudinary'

export default function AddModal({ open, onClose }) {
  const { add } = useCollection()
  const [name, setName] = useState('')
  const [era, setEra] = useState(null)
  const [price, setPrice] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStep, setUploadStep] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef()
  const cameraRef = useRef()

  const reset = () => {
    setName(''); setEra(null); setPrice(''); setPhoto(null); setPhotoFile(null)
    setUploading(false); setUploadStep('')
  }

  const handleClose = () => { reset(); onClose() }

  const handleFile = async (file) => {
    if (!file) return
    setPhotoFile(file)
    const url = URL.createObjectURL(file)
    setPhoto(url)
    setUploading(true)
    setUploadStep('🪄 Détourage en cours...')
    try {
      const nobg = await removeBackground(file)
      setUploadStep('✅ Détourage réussi !')
      setPhotoFile(nobg)
      setPhoto(URL.createObjectURL(nobg))
    } catch {
      setUploadStep('⚠️ Photo originale utilisée')
    }
    setTimeout(() => setUploading(false), 1000)
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      let photo_url = null
      if (photoFile) {
        setUploadStep('📤 Upload en cours...')
        photo_url = await uploadPhoto(photoFile)
      }
      await add({
        Name: name.trim(),
        era: era || null,
        price: price ? parseFloat(price) : null,
        photo_url,
        added_at: new Date().toISOString()
      })
      handleClose()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center" style={{ background: 'rgba(0,5,20,0.9)' }}
          onClick={e => e.target === e.currentTarget && handleClose()}>
          <motion.div
            className="bg-surface border-t-2 border-jaune w-full max-w-[480px] rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slideUp"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type:'spring', damping:25, stiffness:300 }}
          >
            <div className="w-10 h-1 bg-bord rounded-full mx-auto mt-3" />
            <div className="flex items-center justify-between px-5 py-4 border-b border-bord">
              <div className="font-bebas text-2xl tracking-widest text-jaune">NOUVELLE ÉCHARPE</div>
              <button onClick={handleClose} className="w-8 h-8 rounded-full bg-surface2 border border-bord text-white flex items-center justify-center cursor-pointer">✕</button>
            </div>

            <div className="p-5 flex flex-col gap-5">
              {/* Photo */}
              <div>
                <div className="text-muted text-xs uppercase tracking-widest mb-2">Photo</div>
                <div className="aspect-video bg-surface2 border-2 border-dashed border-bord rounded-2xl overflow-hidden relative flex flex-col items-center justify-center gap-2">
                  {photo
                    ? <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    : <><span className="text-3xl">🧣</span><span className="text-muted text-sm">Ajoute une photo</span></>}
                  {uploading && (
                    <div className="absolute inset-0 bg-noir/70 flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 border-2 border-bord border-t-jaune rounded-full animate-spin-slow" />
                      <span className="text-jaune text-xs font-semibold">{uploadStep}</span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button onClick={() => cameraRef.current?.click()}
                    className="py-2.5 rounded-xl border border-bord bg-surface2 text-sm text-white flex items-center justify-center gap-2 cursor-pointer active:border-jaune">
                    📷 Caméra
                  </button>
                  <button onClick={() => fileRef.current?.click()}
                    className="py-2.5 rounded-xl border border-bord bg-surface2 text-sm text-white flex items-center justify-center gap-2 cursor-pointer active:border-jaune">
                    🖼️ Galerie
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFile(e.target.files[0])} />
              </div>

              {/* Nom */}
              <div>
                <div className="text-muted text-xs uppercase tracking-widest mb-2">Nom / Description</div>
                <input className="w-full bg-surface2 border border-bord rounded-xl px-4 py-3 text-white outline-none focus:border-jaune transition-colors"
                  placeholder="ex : Écharpe domicile collector"
                  value={name} onChange={e => setName(e.target.value)} />
              </div>

              {/* Ère */}
              <div>
                <div className="text-muted text-xs uppercase tracking-widest mb-2">Ère du logo</div>
                <div className="grid grid-cols-3 gap-2">
                  {ERAS.map(e => (
                    <motion.button key={e.id} whileTap={{ scale:0.94 }}
                      className={`py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${era === e.id ? 'bg-jaune/15 border-jaune text-jaune' : 'bg-surface2 border-bord text-muted'}`}
                      onClick={() => setEra(e.id)}>
                      {e.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Prix */}
              <div>
                <div className="text-muted text-xs uppercase tracking-widest mb-2">Prix payé (optionnel)</div>
                <div className="relative">
                  <input type="number" className="w-full bg-surface2 border border-bord rounded-xl px-4 py-3 text-white outline-none focus:border-jaune pr-10"
                    placeholder="ex : 15" value={price} onChange={e => setPrice(e.target.value)} />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">€</span>
                </div>
              </div>

              {/* Save */}
              <motion.button onClick={handleSave} disabled={saving || !name.trim()} whileTap={{ scale:0.97 }}
                className="w-full py-4 bg-jaune text-bleu2 font-bebas text-xl tracking-widest rounded-2xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                {saving ? 'Sauvegarde...' : 'AJOUTER À MA COLLECTION'}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
