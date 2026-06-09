import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection } from '../context/CollectionContext'
import { getEraLabel, getScarfNumber } from '../lib/eras'
import { ERAS } from '../lib/eras'

export default function ScarfDetail({ scarf, onClose }) {
  const { collection, update, remove } = useCollection()
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(scarf.Name)
  const [editEra, setEditEra] = useState(scarf.era)
  const [editPrice, setEditPrice] = useState(scarf.price || '')
  const [saving, setSaving] = useState(false)
  const [lightbox, setLightbox] = useState(false)

  const num = getScarfNumber(scarf, collection)
  const eraLabel = getEraLabel(scarf.era)
  const photo = scarf.photo_url

  const handleSave = async () => {
    setSaving(true)
    try {
      await update(scarf.id, { Name: editName, era: editEra, price: editPrice ? parseFloat(editPrice) : null })
      setEditing(false)
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirm('Supprimer cette écharpe ?')) return
    await remove(scarf.id)
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 bg-noir z-[300] overflow-y-auto"
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>

        {/* Top buttons */}
        <div className="fixed top-4 left-4 z-10">
          <motion.button onClick={onClose} whileTap={{ scale:0.9 }}
            className="w-10 h-10 rounded-full bg-noir/80 border border-jaune text-jaune flex items-center justify-center text-lg cursor-pointer">
            ←
          </motion.button>
        </div>
        <div className="fixed top-4 right-16 z-10">
          <motion.button onClick={() => setEditing(!editing)} whileTap={{ scale:0.9 }}
            className="w-10 h-10 rounded-full bg-noir/80 border border-jaune text-jaune flex items-center justify-center cursor-pointer">
            ✏️
          </motion.button>
        </div>
        <div className="fixed top-4 right-4 z-10">
          <motion.button onClick={handleDelete} whileTap={{ scale:0.9 }}
            className="w-10 h-10 rounded-full bg-noir/80 border border-red-500 text-red-500 flex items-center justify-center cursor-pointer">
            🗑
          </motion.button>
        </div>

        {/* Photo */}
        <div className="aspect-[4/3] bg-surface2 flex items-center justify-center overflow-hidden cursor-zoom-in"
          onClick={() => photo && setLightbox(true)}>
          {photo
            ? <img src={photo} alt={scarf.Name} className="w-full h-full object-cover" />
            : <span className="text-8xl opacity-10">🧣</span>}
        </div>

        {/* Info */}
        <div className="p-5">
          {editing ? (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-muted text-xs uppercase tracking-widest mb-1.5 block">Nom</label>
                <input className="w-full bg-surface2 border border-bord rounded-xl px-4 py-3 text-white outline-none focus:border-jaune"
                  value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div>
                <label className="text-muted text-xs uppercase tracking-widest mb-1.5 block">Ère</label>
                <div className="grid grid-cols-3 gap-2">
                  {ERAS.map(e => (
                    <button key={e.id}
                      className={`py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${editEra === e.id ? 'bg-jaune/15 border-jaune text-jaune' : 'bg-surface2 border-bord text-muted'}`}
                      onClick={() => setEditEra(e.id)}>
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-muted text-xs uppercase tracking-widest mb-1.5 block">Prix (€)</label>
                <input type="number" className="w-full bg-surface2 border border-bord rounded-xl px-4 py-3 text-white outline-none focus:border-jaune"
                  value={editPrice} onChange={e => setEditPrice(e.target.value)} placeholder="ex: 15" />
              </div>
              <motion.button onClick={handleSave} disabled={saving} whileTap={{ scale:0.97 }}
                className="w-full py-4 bg-jaune text-bleu2 font-bebas text-xl tracking-widest rounded-2xl cursor-pointer disabled:opacity-50">
                {saving ? 'Sauvegarde...' : 'ENREGISTRER'}
              </motion.button>
            </div>
          ) : (
            <>
              <div className="font-bebas text-3xl tracking-widest text-jaune">{scarf.Name}</div>
              {scarf.era && (
                <div className="inline-block mt-2 bg-jaune/10 border border-jaune/30 rounded-lg px-3 py-1 text-jaune text-xs font-semibold">
                  🏷 {eraLabel} · #{num}
                </div>
              )}
              <div className="mt-2 text-argent text-xs">
                Ajoutée le {new Date(scarf.added_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })}
              </div>
              <div className="mt-4 bg-surface border border-bord rounded-2xl p-4 space-y-2">
                <div className="text-muted text-xs uppercase tracking-widest mb-3">Infos</div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">📸 Photo</span>
                  <span className="font-semibold text-jaune">{photo ? 'Oui' : 'Non'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">🏷 Ère</span>
                  <span className="font-semibold">{eraLabel || 'Non renseignée'}</span>
                </div>
                {scarf.price && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">💰 Prix payé</span>
                    <span className="font-semibold text-jaune">{scarf.price} €</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Lightbox */}
        {lightbox && (
          <motion.div className="fixed inset-0 bg-black/95 z-[400] flex items-center justify-center"
            onClick={() => setLightbox(false)}
            initial={{ opacity:0 }} animate={{ opacity:1 }}>
            <img src={photo} alt={scarf.Name} className="max-w-full max-h-full object-contain rounded-xl" />
            <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center text-lg cursor-pointer">✕</button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
