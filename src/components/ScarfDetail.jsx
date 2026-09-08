import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection } from '../context/CollectionContext'
import { getEraLabel, getScarfNumber, ERAS } from '../lib/eras'
import { uploadToCloudinary, removeBackground } from '../lib/cloudinary'
import { playDelete, vibrate } from '../lib/sounds'
import PhotoViewer from './PhotoViewer'
import { cldUrl } from '../lib/cloudinary'
import { getResultStyle, formatScore, formatFixture, formatMatchDate } from '../lib/match'

export default function ScarfDetail({ scarf, onClose, onPrev, onNext }) {
  const { collection, update, remove } = useCollection()
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(scarf.Name)
  const [editEra, setEditEra] = useState(scarf.era)
  const [editPrice, setEditPrice] = useState(scarf.price || '')
  const [editIsMatch, setEditIsMatch] = useState(scarf.is_match || false)
  const [editOpponent, setEditOpponent] = useState(scarf.opponent || '')
  const [editCompetition, setEditCompetition] = useState(scarf.competition || '')
  const [editMatchDate, setEditMatchDate] = useState(scarf.match_date || '')
  const [editScoreFcsm, setEditScoreFcsm] = useState(scarf.score_fcsm ?? '')
  const [editScoreOpp, setEditScoreOpp] = useState(scarf.score_opponent ?? '')
  const [editIsHome, setEditIsHome] = useState(scarf.is_home !== false)
  const [saving, setSaving] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const [reprocessing, setReprocessing] = useState(false)
  const [reprocessStep, setReprocessStep] = useState('')
  const [rotating, setRotating] = useState(false)
  const [infoExpanded, setInfoExpanded] = useState(false)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)

  const currentScarf = collection.find(s => String(s.id) === String(scarf.id)) || scarf
  const num = getScarfNumber(scarf, collection)
  const eraLabel = getEraLabel(currentScarf.era || scarf.era)
  const currentPhoto = currentScarf.photo_url
  const matchResult = getResultStyle(currentScarf)

  const handleSave = async () => {
    setSaving(true)
    try {
      await update(scarf.id, {
        Name: editName,
        era: editEra || null,
        price: editPrice ? parseFloat(editPrice) : null,
        is_match: editIsMatch,
        // Les champs de match sont remis à null si la case est décochée,
        // pour ne pas laisser de données orphelines en base.
        opponent:       editIsMatch ? (editOpponent.trim() || null) : null,
        competition:    editIsMatch ? (editCompetition.trim() || null) : null,
        match_date:     editIsMatch ? (editMatchDate || null) : null,
        score_fcsm:     editIsMatch && editScoreFcsm !== '' ? parseInt(editScoreFcsm, 10) : null,
        score_opponent: editIsMatch && editScoreOpp  !== '' ? parseInt(editScoreOpp, 10)  : null,
        is_home:        editIsMatch ? editIsHome : null,
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

  const handleRotate = async () => {
    if (!currentPhoto || rotating) return
    setRotating(true)
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = currentPhoto })
      const canvas = document.createElement('canvas')
      canvas.width = img.height; canvas.height = img.width
      const ctx = canvas.getContext('2d')
      ctx.translate(canvas.width/2, canvas.height/2)
      ctx.rotate(90 * Math.PI/180)
      ctx.drawImage(img, -img.width/2, -img.height/2)
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'))
      const file = new File([blob], 'rotated.png', { type:'image/png' })
      const url = await uploadToCloudinary(file)
      await update(scarf.id, { photo_url: url })
    } catch(e) { console.error(e) }
    setRotating(false)
  }

  const handleReprocess = async () => {
    if (!currentPhoto) return
    setReprocessing(true)
    setReprocessStep('⏳ Récupération...')
    try {
      const r = await fetch(currentPhoto)
      const blob = await r.blob()
      const file = new File([blob], 'photo.jpg', { type:'image/jpeg' })
      setReprocessStep('🪄 Détourage...')
      const nobg = await removeBackground(file)
      setReprocessStep('📤 Upload...')
      const url = await uploadToCloudinary(nobg)
      await update(scarf.id, { photo_url: url })
      setReprocessStep('✅ Terminé !')
      setTimeout(() => setReprocessStep(''), 2000)
    } catch(e) { setReprocessStep('❌ Erreur'); setTimeout(() => setReprocessStep(''), 2000) }
    setReprocessing(false)
  }

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const dx = touchStartX.current - e.changedTouches[0].clientX
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY)
    if (Math.abs(dx) > 60 && dy < 40) {
      if (dx > 0 && onNext) onNext()
      else if (dx < 0 && onPrev) onPrev()
    }
    touchStartX.current = null
  }

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[300] flex flex-col"
        style={{ background: '#080C1A' }}
        initial={{ x:'100%' }} animate={{ x:0 }} exit={{ x:'100%' }}
        transition={{ type:'tween', duration:0.28, ease:[0.32,0.72,0,1] }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}>

        {/* PHOTO PLEIN ÉCRAN */}
        <div className="relative flex-1 overflow-hidden cursor-zoom-in"
          style={{ background: 'linear-gradient(160deg, #0a1628 0%, #0d1f3c 60%, #080C1A 100%)' }}
          onClick={() => !editing && currentPhoto && setLightbox(true)}>

          {currentPhoto
            ? <motion.img key={currentPhoto} src={cldUrl(currentPhoto, 1000)} alt={currentScarf.Name}
                className="absolute inset-0 w-full h-full object-contain p-6"
                style={{ filter:'drop-shadow(0 8px 32px rgba(0,0,0,0.8))' }}
                initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
                transition={{ duration:0.3 }} />
            : <div className="absolute inset-0 flex items-center justify-center text-9xl opacity-5">🧣</div>}

          {/* Gradient bottom overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
            style={{ background:'linear-gradient(to top, #080C1A, transparent)' }} />

          {/* Top buttons */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-4">
            <motion.button onClick={(e) => { e.stopPropagation(); onClose() }} whileTap={{ scale:0.9 }}
              className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer text-white text-xl"
              style={{ background:'rgba(8,12,26,0.7)', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.1)' }}>
              ←
            </motion.button>
            <div className="flex gap-2">
              <motion.button onClick={(e) => { e.stopPropagation(); handleRotate() }} disabled={rotating} whileTap={{ scale:0.9 }}
                className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer"
                style={{ background:'rgba(8,12,26,0.7)', backdropFilter:'blur(12px)', border:'1px solid rgba(245,196,0,0.3)' }}>
                {rotating ? <div className="w-4 h-4 border-2 border-jaune/30 border-t-jaune rounded-full animate-spin-slow"/> : <span className="text-jaune">🔄</span>}
              </motion.button>
              <motion.button onClick={(e) => { e.stopPropagation(); setEditing(!editing) }} whileTap={{ scale:0.9 }}
                className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer"
                style={{ background: editing ? 'rgba(245,196,0,0.9)' : 'rgba(8,12,26,0.7)', backdropFilter:'blur(12px)', border:'1px solid rgba(245,196,0,0.3)' }}>
                <span style={{ filter: editing ? 'none' : '' }}>✏️</span>
              </motion.button>
              <motion.button onClick={(e) => { e.stopPropagation(); handleDelete() }} whileTap={{ scale:0.9 }}
                className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer"
                style={{ background:'rgba(8,12,26,0.7)', backdropFilter:'blur(12px)', border:'1px solid rgba(239,68,68,0.4)' }}>
                🗑
              </motion.button>
            </div>
          </div>

          {/* Numéro flottant */}
          <div className="absolute bottom-4 left-4 font-bebas text-6xl text-white/5 leading-none select-none">
            #{num}
          </div>
        </div>

        {/* INFO PANEL - glisse depuis le bas */}
        <motion.div className="flex-shrink-0 overflow-y-auto"
          style={{ background:'#080C1A', maxHeight: editing ? '70vh' : '45vh' }}>

          {!editing ? (
            <div className="px-5 pt-4 pb-24">
              {/* Nom + ère */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <div className="font-bebas text-2xl tracking-widest text-jaune leading-tight">
                    {currentScarf.Name || scarf.Name}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {(currentScarf.era || scarf.era) && (
                      <span className="bg-jaune/10 border border-jaune/30 rounded-lg px-2.5 py-0.5 text-jaune text-xs font-semibold">
                        🏷 {eraLabel}
                      </span>
                    )}
                    <span className="bg-surface border border-bord rounded-lg px-2.5 py-0.5 text-argent text-xs font-bebas">
                      #{num}
                    </span>
                    {(currentScarf.price || scarf.price) && (
                      <span className="bg-green-500/10 border border-green-500/30 rounded-lg px-2.5 py-0.5 text-green-400 text-xs font-semibold">
                        💰 {currentScarf.price || scarf.price} €
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-muted text-xs mb-4">
                Ajoutée le {new Date(scarf.added_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })}
              </div>

              {/* Rencontre */}
              {matchResult && (
                <div className="rounded-2xl p-4 mb-4"
                  style={{ background: matchResult.bg, border: `1px solid ${matchResult.border}` }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-bebas text-base tracking-wider text-white truncate">
                        {formatFixture(currentScarf)}
                      </div>
                      {currentScarf.competition && (
                        <div className="text-muted text-xs mt-0.5 truncate">{currentScarf.competition}</div>
                      )}
                      {formatMatchDate(currentScarf) && (
                        <div className="text-muted text-[0.68rem] mt-0.5">
                          {formatMatchDate(currentScarf)} · {currentScarf.is_home === false ? 'Extérieur' : 'Domicile'}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bebas text-3xl leading-none" style={{ color: matchResult.color }}>
                        {formatScore(currentScarf)}
                      </div>
                      <div className="text-[0.6rem] uppercase tracking-widest mt-1" style={{ color: matchResult.color }}>
                        {matchResult.label}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bouton détourer */}
              <motion.button onClick={handleReprocess} disabled={reprocessing || !currentPhoto} whileTap={{ scale:0.97 }}
                className="w-full py-3 rounded-2xl font-bebas tracking-widest text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                style={{ background:'rgba(245,196,0,0.08)', border:'1px solid rgba(245,196,0,0.25)', color:'#F5C400' }}>
                {reprocessing
                  ? <><div className="w-4 h-4 border-2 border-jaune/30 border-t-jaune rounded-full animate-spin-slow"/>{reprocessStep}</>
                  : reprocessStep || '🪄 DÉTOURER LA PHOTO'}
              </motion.button>
            </div>
          ) : (
            <div className="px-5 pt-4 pb-24 flex flex-col gap-4">
              <div className="font-bebas text-lg tracking-widest text-jaune">MODIFIER</div>
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
              {/* Écharpe de match */}
              <div className="rounded-2xl border border-bord bg-surface2/50 overflow-hidden">
                <button
                  onClick={() => setEditIsMatch(!editIsMatch)}
                  className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer">
                  <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{
                      borderColor: editIsMatch ? '#F5C400' : 'var(--bord)',
                      background:  editIsMatch ? '#F5C400' : 'transparent',
                    }}>
                    {editIsMatch && <span className="text-bleu2 text-xs font-black">✓</span>}
                  </div>
                  <span className="text-sm text-white">Écharpe de match</span>
                </button>

                {editIsMatch && (
                  <div className="px-4 pb-4 flex flex-col gap-3 border-t border-bord pt-3">
                    <div>
                      <label className="text-muted text-xs uppercase tracking-widest mb-1.5 block">Adversaire</label>
                      <input
                        className="w-full bg-surface border border-bord rounded-xl px-4 py-2.5 text-white outline-none focus:border-jaune text-sm"
                        value={editOpponent}
                        onChange={e => setEditOpponent(e.target.value)}
                        placeholder="ex : AS Monaco" />
                    </div>

                    <div>
                      <label className="text-muted text-xs uppercase tracking-widest mb-1.5 block">Compétition</label>
                      <input
                        className="w-full bg-surface border border-bord rounded-xl px-4 py-2.5 text-white outline-none focus:border-jaune text-sm"
                        value={editCompetition}
                        onChange={e => setEditCompetition(e.target.value)}
                        placeholder="ex : Finale Coupe de la Ligue" />
                    </div>

                    <div>
                      <label className="text-muted text-xs uppercase tracking-widest mb-1.5 block">Lieu</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[{ v: true, l: '🏠 Domicile' }, { v: false, l: '✈️ Extérieur' }].map(o => (
                          <button key={String(o.v)} onClick={() => setEditIsHome(o.v)}
                            className={`py-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                              editIsHome === o.v
                                ? 'bg-jaune/15 border-jaune text-jaune'
                                : 'bg-surface border-bord text-muted'}`}>
                            {o.l}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-muted text-xs uppercase tracking-widest mb-1.5 block">Score</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <input type="number" min="0" inputMode="numeric"
                            className="w-full bg-surface border border-bord rounded-xl px-3 py-2.5 text-white outline-none focus:border-jaune text-sm text-center"
                            value={editScoreFcsm}
                            onChange={e => setEditScoreFcsm(e.target.value)}
                            placeholder="0" />
                          <div className="text-center text-jaune text-[0.6rem] font-bebas tracking-widest mt-1">FCSM</div>
                        </div>
                        <span className="text-muted font-bebas text-lg pb-5">–</span>
                        <div className="flex-1">
                          <input type="number" min="0" inputMode="numeric"
                            className="w-full bg-surface border border-bord rounded-xl px-3 py-2.5 text-white outline-none focus:border-jaune text-sm text-center"
                            value={editScoreOpp}
                            onChange={e => setEditScoreOpp(e.target.value)}
                            placeholder="0" />
                          <div className="text-center text-muted text-[0.6rem] font-bebas tracking-widest mt-1 truncate">
                            {editOpponent.trim() ? editOpponent.trim().toUpperCase() : 'ADVERSAIRE'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-muted text-xs uppercase tracking-widest mb-1.5 block">Date du match</label>
                      <input type="date"
                        className="w-full bg-surface border border-bord rounded-xl px-4 py-2.5 text-white outline-none focus:border-jaune text-sm"
                        value={editMatchDate}
                        onChange={e => setEditMatchDate(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              <motion.button onClick={handleSave} disabled={saving} whileTap={{ scale:0.97 }}
                className="w-full py-4 bg-jaune text-bleu2 font-bebas text-xl tracking-widest rounded-2xl cursor-pointer disabled:opacity-50">
                {saving ? 'SAUVEGARDE...' : 'ENREGISTRER'}
              </motion.button>
            </div>
          )}
        </motion.div>

        {/* Photo Viewer with zoom */}
        {lightbox && currentPhoto && (
          <PhotoViewer src={currentPhoto} onClose={() => setLightbox(false)} />
        )}
      </motion.div>
    </AnimatePresence>
  )
}
