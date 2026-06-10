import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection } from '../context/CollectionContext'
import { ERAS } from '../lib/eras'
import { uploadToCloudinary, removeBackground } from '../lib/cloudinary'

export default function AddModal({ open, onClose }) {
  const { add } = useCollection()
  const [name, setName] = useState('')
  const [era, setEra] = useState(null)
  const [price, setPrice] = useState('')
  const [preview, setPreview] = useState(null)
  const [processedFile, setProcessedFile] = useState(null)
  const [step, setStep] = useState('')
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef()
  const cameraRef = useRef()

  const reset = () => {
    setName(''); setEra(null); setPrice('')
    setPreview(null); setProcessedFile(null)
    setStep(''); setProcessing(false); setSaving(false)
  }

  const handleClose = () => { reset(); onClose() }

  const handleFile = async (file) => {
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setProcessing(true)
    setStep('🪄 Détourage en cours...')
    try {
      const nobg = await removeBackground(file)
      setProcessedFile(nobg)
      setPreview(URL.createObjectURL(nobg))
      setStep('✅ Fond supprimé !')
    } catch {
      setProcessedFile(file)
      setStep('⚠️ Photo originale utilisée')
    }
    setTimeout(() => setProcessing(false), 1000)
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      let photo_url = null
      if (processedFile) {
        setStep('📤 Upload en cours...')
        photo_url = await uploadToCloudinary(processedFile)
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
      setStep('❌ Erreur : ' + e.message)
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center"
          style={{ background: 'rgba(0,5,20,0.9)' }}
          onClick={e => e.target === e.currentTarget && handleClose()}>
          <motion.div
            className="bg-surface border-t-2 border-jaune w-full max-w-[480px] rounded-t-3xl max-h-[92vh] overflow-y-auto"
            initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
            transition={{ type:'spring', damping:25, stiffness:300 }}>

            <div className="w-10 h-1 bg-bord rounded-full mx-auto mt-3" />
            <div className="flex items-center justify-between px-5 py-4 border-b border-bord">
              <div className="font-bebas text-2xl tracking-widest text-jaune">NOUVELLE ÉCHARPE</div>
              <button onClick={handleClose} className="w-8 h-8 rounded-full bg-surface2 border border-bord text-white flex items-center justify-center cursor-pointer">✕</button>
            </div>

            <div className="p-5 flex flex-col gap-5">
              {/* Photo zone */}
              <div>
                <div className="text-muted text-xs uppercase tracking-widest mb-2">Photo</div>
                <div className="aspect-video bg-surface2 border-2 border-dashed border-bord rounded-2xl overflow-hidden relative flex flex-col items-center justify-center gap-2 cursor-pointer"
                  onClick={() => fileRef.current?.click()}>
                  {preview
                    ? <img src={preview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    : <><span className="text-4xl">🧣</span><span className="text-muted text-sm">Tap pour ajouter une photo</span></>}
                  {(processing || saving) && step && (
                    <div className="absolute inset-0 bg-noir/75 flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
                      <div className="w-8 h-8 border-2 border-bord border-t-jaune rounded-full animate-spin-slow" />
                      <span className="text-jaune text-xs font-semibold text-center px-4">{step}</span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button onClick={() => cameraRef.current?.click()}
                    className="py-2.5 rounded-xl border border-bord bg-surface2 text-sm text-white flex items-center justify-center gap-2 cursor-pointer active:border-jaune transition-colors">
                    📷 Caméra
                  </button>
                  <button onClick={() => fileRef.current?.click()}
                    className="py-2.5 rounded-xl border border-bord bg-surface2 text-sm text-white flex items-center justify-center gap-2 cursor-pointer active:border-jaune transition-colors">
                    🖼️ Galerie
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { handleFile(e.target.files[0]); e.target.value='' }} />
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={e => { handleFile(e.target.files[0]); e.target.value='' }} />
              </div>

              {/* Nom */}
              <div>
                <div className="text-muted text-xs uppercase tracking-widest mb-2">Nom / Description</div>
                <input className="w-full bg-surface2 border border-bord rounded-xl px-4 py-3 text-white outline-none focus:border-jaune transition-colors text-sm"
                  placeholder="ex : Finale Coupe de France 2007"
                  value={name} onChange={e => setName(e.target.value)} />
              </div>

              {/* Ère */}
              <div>
                <div className="text-muted text-xs uppercase tracking-widest mb-2">Ère du logo</div>
                <div className="grid grid-cols-3 gap-2">
                  {ERAS.map(e => (
                    <motion.button key={e.id} whileTap={{ scale:0.93 }}
                      className={`py-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${era === e.id ? 'bg-jaune/15 border-jaune text-jaune' : 'bg-surface2 border-bord text-muted'}`}
                      onClick={() => setEra(era === e.id ? null : e.id)}>
                      {e.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Prix */}
              <div>
                <div className="text-muted text-xs uppercase tracking-widest mb-2">Prix payé (optionnel)</div>
                <div className="relative">
                  <input type="number" min="0" step="0.01"
                    className="w-full bg-surface2 border border-bord rounded-xl px-4 py-3 text-white outline-none focus:border-jaune transition-colors pr-10 text-sm"
                    placeholder="ex : 15"
                    value={price} onChange={e => setPrice(e.target.value)} />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-sm">€</span>
                </div>
              </div>

              {/* Save */}
              <motion.button
                onClick={handleSave}
                disabled={saving || !name.trim() || processing}
                whileTap={{ scale:0.97 }}
                className="w-full py-4 bg-jaune text-bleu2 font-bebas text-xl tracking-widest rounded-2xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-opacity">
                {saving ? 'SAUVEGARDE...' : 'AJOUTER À MA COLLECTION'}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
