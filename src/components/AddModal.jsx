import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection } from '../context/CollectionContext'
import { ERAS } from '../lib/eras'
import { uploadToCloudinary, removeBackground, compressImage, getRemoveBgCredits } from '../lib/cloudinary'
import { playAdd, vibrate } from '../lib/sounds'
import confetti from 'canvas-confetti'

const PROXY_URL = 'https://fcsm-ai-proxy.echarpe-fcsm-rohn.workers.dev/'
function getAnthropicKey() { return localStorage.getItem('fcsm_anthropic_key') || '' }

function launchConfetti() {
  const colors = ['#F5C400', '#D4A900', '#003087', '#ffffff']
  confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors })
  setTimeout(() => confetti({ particleCount: 40, spread: 50, origin: { y: 0.5 }, colors }), 200)
}

export default function AddModal({ open, onClose }) {
  const { add, collection } = useCollection()
  const [name, setName] = useState('')
  const [era, setEra] = useState(null)
  const [price, setPrice] = useState('')
  const [preview, setPreview] = useState(null)
  const [processedFile, setProcessedFile] = useState(null)
  const [step, setStep] = useState('')
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [doublonAlert, setDoublonAlert] = useState(null)
  const [checkingDoublon, setCheckingDoublon] = useState(false)
  const [credits, setCredits] = useState(null)
  const [loadingCredits, setLoadingCredits] = useState(false)
  const fileRef = useRef()
  const cameraRef = useRef()

  const reset = () => {
    setName(''); setEra(null); setPrice('')
    setPreview(null); setProcessedFile(null)
    setStep(''); setProcessing(false); setSaving(false)
    setDoublonAlert(null); setCheckingDoublon(false)
    setCredits(null)
  }

  const fetchCredits = async () => {
    setLoadingCredits(true)
    try {
      const results = await getRemoveBgCredits()
      setCredits(results)
    } catch(e) {}
    setLoadingCredits(false)
  }

  const handleClose = () => { reset(); onClose() }

  const handleFile = async (file) => {
    if (!file) return
    setDoublonAlert(null)
    setPreview(URL.createObjectURL(file))
    setProcessing(true)

    let finalFile = file
    try {
      setStep('🪄 Détourage en cours (1/3)...')
      const nobg = await removeBackground(file, (msg) => setStep(msg))
      finalFile = nobg
      setPreview(URL.createObjectURL(nobg))
      setStep('✅ Fond supprimé !')
      setTimeout(() => setStep(''), 1500)
    } catch(e) {
      setStep('⚠️ ' + (e.message || 'Détourage échoué') + ' — photo originale utilisée')
      setTimeout(() => setStep(''), 3000)
    }

    setProcessedFile(finalFile)
    setProcessing(false)

    const reader = new FileReader()
    reader.onload = e => {
      checkDoublon(e.target.result)
      suggestEraAndName(e.target.result)
    }
    reader.readAsDataURL(finalFile)
  }

  const checkDoublon = async (dataUrl) => {
    if (!getAnthropicKey() || !collection.length) return
    setCheckingDoublon(true)
    try {
      const compressed = await compressImage(dataUrl, 400)
      const base64 = compressed.split(',')[1]
      const scarfsDesc = collection.map((s,i) => `${i+1}. "${s.Name}" (ere: ${s.era||'?'})`).join('\n')
      const r = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'x-api-key': getAnthropicKey(), 'anthropic-version':'2023-06-01' },
        body: JSON.stringify({
          model: 'claude-opus-4-5', max_tokens: 200,
          system: 'Tu reponds UNIQUEMENT en JSON valide.',
          messages: [{ role:'user', content: [
            { type:'image', source:{ type:'base64', media_type:'image/jpeg', data:base64 } },
            { type:'text', text:`Ma collection:\n${scarfsDesc}\n\nJSON: {"already_have":false,"similar_scarfs":[],"verdict":""}` }
          ]}]
        })
      })
      if (!r.ok) return
      const data = await r.json()
      const match = data.content[0].text.match(/\{[\s\S]*\}/)
      if (!match) return
      const res = JSON.parse(match[0])
      if (res.already_have && res.similar_scarfs?.length > 0) {
        const matches = res.similar_scarfs.map(i => collection[i-1]).filter(Boolean)
        setDoublonAlert({ matches, verdict: res.verdict })
      }
    } catch(e) { console.error('Doublon check failed:', e) }
    setCheckingDoublon(false)
  }

  const suggestEraAndName = async (dataUrl) => {
    if (!getAnthropicKey()) return
    try {
      const compressed = await compressImage(dataUrl, 400)
      const base64 = compressed.split(',')[1]
      const r = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'x-api-key': getAnthropicKey(), 'anthropic-version':'2023-06-01' },
        body: JSON.stringify({
          model: 'claude-opus-4-5', max_tokens: 200,
          system: 'Tu reponds UNIQUEMENT en JSON valide.',
          messages: [{ role:'user', content: [
            { type:'image', source:{ type:'base64', media_type:'image/jpeg', data:base64 } },
            { type:'text', text:`Tu es un expert en écharpes de football du FCSM (Football Club Sochaux-Montbéliard, couleurs rouge et jaune). Analyse UNIQUEMENT ce qui est VISIBLE et LISIBLE sur cette écharpe. Ne devine jamais un match ou événement qui n'est pas clairement écrit dessus.\n\nRègles strictes:\n- "name": décris ce que tu vois réellement (texte écrit, logo, couleurs). Ex: "Écharpe rayée rouge blanc FCSM", "Écharpe 100 ans FCSM". JAMAIS inventer une finale ou un match si ce n'est pas écrit dessus.\n- "era": déduis du style graphique, typographie et couleurs. Valeurs: 1930-1940|1940-1980|1990-1994|1994-1997|1997-2000|2000-2004|2004-2010|2010-2015|2015-auj|null\n\nRéponds UNIQUEMENT en JSON: {"name":"...","era":"..."}` }
          ]}]
        })
      })
      if (!r.ok) return
      const data = await r.json()
      const match = data.content[0].text.match(/\{[\s\S]*\}/)
      if (!match) return
      const res = JSON.parse(match[0])
      if (res.name && !name) setName(res.name)
      if (res.era) setEra(res.era)
      setStep('🤖 Nom et ère suggérés par l\'IA !')
      setTimeout(() => setStep(''), 2000)
    } catch(e) { console.error('AI suggest failed:', e) }
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    setStep('📤 Upload en cours...')
    try {
      let photo_url = null
      if (processedFile) {
        photo_url = await uploadToCloudinary(processedFile)
      }
      await add({
        Name: name.trim(),
        era: era || null,
        price: price ? parseFloat(price) : null,
        photo_url,
        added_at: new Date().toISOString()
      })
      vibrate([30, 20, 60])
      playAdd()
      launchConfetti()
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
                    ? <img src={preview} alt="" className="absolute inset-0 w-full h-full object-contain" />
                    : <><span className="text-4xl">🧣</span><span className="text-muted text-sm">Tap pour ajouter une photo</span></>}
                  {(processing || saving) && (
                    <div className="absolute inset-0 bg-noir/75 flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
                      <div className="w-8 h-8 border-2 border-bord border-t-jaune rounded-full animate-spin-slow" />
                      {step && <span className="text-jaune text-xs font-semibold text-center px-4">{step}</span>}
                    </div>
                  )}
                  {!processing && !saving && step && (
                    <div className="absolute bottom-2 left-2 right-2 bg-noir/80 rounded-lg px-3 py-1.5 text-center">
                      <span className="text-jaune text-xs">{step}</span>
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

                {/* Crédits remove.bg */}
                <div className="mt-2">
                  {!credits && (
                    <button onClick={fetchCredits} disabled={loadingCredits}
                      className="w-full py-2 rounded-xl border border-bord bg-surface2 text-muted text-xs flex items-center justify-center gap-2 cursor-pointer active:border-jaune transition-colors disabled:opacity-50">
                      {loadingCredits
                        ? <><div className="w-3 h-3 border border-bord border-t-jaune rounded-full animate-spin-slow" /> Chargement crédits...</>
                        : <>🔑 Voir crédits remove.bg</>}
                    </button>
                  )}
                  {credits && (
                    <div className="bg-surface2 border border-bord rounded-xl px-3 py-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-muted text-xs uppercase tracking-widest">Crédits remove.bg</span>
                        <button onClick={fetchCredits} disabled={loadingCredits} className="text-jaune text-xs cursor-pointer">
                          {loadingCredits ? '...' : '↻'}
                        </button>
                      </div>
                      <div className="flex flex-col gap-1">
                        {credits.map(c => (
                          <div key={c.key} className="flex items-center gap-2">
                            <span className="text-muted text-xs w-10">Clé {c.key}</span>
                            <div className="flex-1 h-1.5 bg-bord rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min((c.credits / 50) * 100, 100)}%`,
                                  background: c.credits > 20 ? '#F5C400' : c.credits > 5 ? '#f97316' : '#ef4444'
                                }} />
                            </div>
                            <span className={`text-xs font-semibold w-8 text-right ${c.credits > 20 ? 'text-jaune' : c.credits > 5 ? 'text-orange-400' : 'text-red-400'}`}>
                              {c.error ? '❌' : c.credits}
                            </span>
                          </div>
                        ))}
                        <div className="text-muted text-[0.6rem] text-right mt-0.5">
                          Total: {credits.reduce((a,c) => a + (c.credits||0), 0)} / {credits.length * 50} crédits
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Doublon check */}
                {checkingDoublon && (
                  <div className="flex items-center gap-2 mt-2 bg-jaune/6 border border-jaune/20 rounded-xl px-3 py-2">
                    <div className="w-4 h-4 border-2 border-jaune/30 border-t-jaune rounded-full animate-spin-slow flex-shrink-0" />
                    <span className="text-muted text-xs">🤖 L'IA vérifie les doublons...</span>
                  </div>
                )}
                {doublonAlert && (
                  <motion.div className="mt-2 bg-red-500/8 border border-red-500/50 rounded-xl p-3"
                    initial={{ opacity:0, y:-5 }} animate={{ opacity:1, y:0 }}>
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-xl">⚠️</span>
                      <div>
                        <div className="text-red-400 font-bold text-sm">L'IA a détecté un possible doublon !</div>
                        <div className="text-muted text-xs mt-0.5">{doublonAlert.verdict || 'Modèle similaire dans ta collection'}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {doublonAlert.matches.slice(0,3).map(s => (
                        <div key={s.id} className="bg-surface2 rounded-lg overflow-hidden border border-red-500/30">
                          <div className="aspect-square overflow-hidden">
                            {s.photo_url
                              ? <img src={s.photo_url} alt="" className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-lg">🧣</div>}
                          </div>
                          <div className="px-1.5 py-1 text-[0.58rem] truncate">{s.Name}</div>
                        </div>
                      ))}
                    </div>
                    <div className="text-muted text-[0.65rem] text-center mt-2">Tu peux quand même sauvegarder si c'est un modèle différent</div>
                  </motion.div>
                )}
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
