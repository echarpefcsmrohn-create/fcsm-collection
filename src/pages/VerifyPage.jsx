import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection } from '../context/CollectionContext'
import { ERAS, getEraLabel, getScarfNumber } from '../lib/eras'
import PageHeader from '../components/PageHeader'
import { compressImage } from '../lib/cloudinary'

const PROXY_URL = 'https://fcsm-ai-proxy.echarpe-fcsm-rohn.workers.dev/'

function getAnthropicKey() { return localStorage.getItem('fcsm_anthropic_key') || '' }
function setAnthropicKey(k) { localStorage.setItem('fcsm_anthropic_key', k) }

export default function VerifyPage() {
  const { collection } = useCollection()
  const [mode, setMode] = useState('manuel')
  const [result, setResult] = useState(null)

  // IA state
  const [iaPhoto, setIaPhoto] = useState(null)
  const [iaFile, setIaFile] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeStep, setAnalyzeStep] = useState('')
  const [analyzeProgress, setAnalyzeProgress] = useState(0)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [keyError, setKeyError] = useState(false)
  const iaFileRef = useRef()
  const iaCameraRef = useRef()

  const runVerify = (eraId) => {
    const matches = collection.filter(s => s.era === eraId)
    setResult({ type: 'manuel', eraId, matches })
  }

  const handleIaPhoto = (file) => {
    if (!file) return
    setIaFile(file)
    setIaPhoto(URL.createObjectURL(file))
    setResult(null)
  }

  const analyzeWithAI = async () => {
    if (!iaPhoto || !iaFile) return
    if (!getAnthropicKey()) { setShowKeyModal(true); return }

    setAnalyzing(true)
    setAnalyzeProgress(15)
    setAnalyzeStep('🗜️ Compression de la photo...')

    try {
      const reader = new FileReader()
      const dataUrl = await new Promise(resolve => {
        reader.onload = e => resolve(e.target.result)
        reader.readAsDataURL(iaFile)
      })
      const compressed = await compressImage(dataUrl, 600)
      const base64 = compressed.split(',')[1]

      setAnalyzeProgress(40)
      setAnalyzeStep('📡 Envoi au serveur IA...')

      // On passe l'index réel (position dans collection) ET le vrai numéro affiché
      const scarfsDesc = collection.map((s,i) => `index:${i} #${getScarfNumber(s, collection)} "${s.Name}" (ere: ${s.era||'?'})`).join('\n')

      const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'x-api-key': getAnthropicKey(), 'anthropic-version':'2023-06-01' },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 500,
          system: 'Tu reponds UNIQUEMENT en JSON valide, sans texte autour.',
          messages: [{
            role: 'user',
            content: [
              { type:'image', source:{ type:'base64', media_type:'image/jpeg', data:base64 } },
              { type:'text', text:`Ma collection FCSM:\n${scarfsDesc}\n\nCette echarpe ressemble-t-elle a une de ma liste ? Reponds avec les valeurs "index" (pas le numero #). JSON: {"already_have":false,"similar_scarfs":[],"verdict":"","description":""}` }
            ]
          }]
        })
      })

      setAnalyzeProgress(70)
      setAnalyzeStep('🤖 Claude analyse l\'écharpe...')

      if (!response.ok) {
        if (response.status === 401) { setShowKeyModal(true); setAnalyzing(false); return }
        throw new Error('Erreur API: ' + response.status)
      }

      const data = await response.json()
      const text = data.content[0].text
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Réponse invalide')

      setAnalyzeProgress(90)
      setAnalyzeStep('🔎 Comparaison avec ta collection...')
      await new Promise(r => setTimeout(r, 400))

      const res = JSON.parse(jsonMatch[0])
      // similar_scarfs contient maintenant des index directs (0-based)
      const matches = (res.similar_scarfs || []).map(i => collection[i]).filter(Boolean)

      setAnalyzeProgress(100)
      setResult({ type:'ia', ...res, matches })
    } catch(e) {
      console.error(e)
      setAnalyzeStep('❌ ' + e.message)
      setTimeout(() => setAnalyzeStep(''), 3000)
    }
    setAnalyzing(false)
  }

  const saveKey = () => {
    if (!keyInput.startsWith('sk-ant-')) { setKeyError(true); return }
    setAnthropicKey(keyInput)
    setShowKeyModal(false)
    setKeyError(false)
  }

  const reset = () => { setResult(null); setIaPhoto(null); setIaFile(null); setAnalyzeStep(''); setAnalyzeProgress(0) }

  return (
    <div className="pb-24">
      <PageHeader title="VÉRIFIER" subtitle="Tu as déjà cette écharpe ?" />
      <div className="px-4 pt-5 flex flex-col gap-4">

        {/* Mode selector */}
        <div className="grid grid-cols-2 gap-2">
          {[{ id:'manuel', label:'🏷️ PAR ÈRE' }, { id:'ia', label:'🤖 IA AUTO' }].map(m => (
            <motion.button key={m.id} whileTap={{ scale:0.95 }}
              className={`py-3 rounded-2xl font-bebas text-base tracking-widest border cursor-pointer transition-colors ${mode === m.id ? 'bg-jaune/12 border-jaune text-jaune' : 'bg-surface2 border-bord text-muted'}`}
              onClick={() => { setMode(m.id); reset() }}>
              {m.label}
            </motion.button>
          ))}
        </div>

        {/* MODE MANUEL */}
        {mode === 'manuel' && (
          <div className="bg-surface border border-bord rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-jaune flex items-center justify-center text-bleu2 text-xs font-black">1</div>
              <div className="font-bebas text-sm tracking-widest text-jaune">IDENTIFIE LE LOGO SUR L'ÉCHARPE</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ERAS.map(e => (
                <motion.button key={e.id} whileTap={{ scale:0.93 }}
                  className={`py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${result?.eraId === e.id ? 'bg-jaune/15 border-jaune text-jaune' : 'bg-surface2 border-bord text-muted'}`}
                  onClick={() => runVerify(e.id)}>
                  {e.label}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* MODE IA */}
        {mode === 'ia' && (
          <div className="flex flex-col gap-3">
            <div className="bg-surface border border-bord rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-jaune flex items-center justify-center text-bleu2 text-xs font-black">1</div>
                <div className="font-bebas text-sm tracking-widest text-jaune">PRENDS UNE PHOTO DE L'ÉCHARPE</div>
              </div>

              <div className="aspect-video bg-surface2 border-2 border-dashed border-bord rounded-2xl overflow-hidden relative flex flex-col items-center justify-center gap-2 cursor-pointer mb-3"
                onClick={() => iaFileRef.current?.click()}>
                {iaPhoto
                  ? <img src={iaPhoto} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  : <><span className="text-3xl">📷</span><span className="text-muted text-sm">Galerie ou caméra</span><span className="text-jaune text-xs">L'IA analyse et compare</span></>}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => iaCameraRef.current?.click()}
                  className="py-2.5 rounded-xl border border-bord bg-surface2 text-sm text-white flex items-center justify-center gap-2 cursor-pointer active:border-jaune">
                  📷 Caméra
                </button>
                <button onClick={() => iaFileRef.current?.click()}
                  className="py-2.5 rounded-xl border border-bord bg-surface2 text-sm text-white flex items-center justify-center gap-2 cursor-pointer active:border-jaune">
                  🖼️ Galerie
                </button>
              </div>
              <input ref={iaFileRef} type="file" accept="image/*" className="hidden" onChange={e => handleIaPhoto(e.target.files[0])} />
              <input ref={iaCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleIaPhoto(e.target.files[0])} />
            </div>

            {/* Analyze button or progress */}
            {iaPhoto && !analyzing && !result && (
              <motion.button onClick={analyzeWithAI} whileTap={{ scale:0.97 }}
                className="w-full py-4 bg-jaune text-bleu2 font-bebas text-xl tracking-widest rounded-2xl cursor-pointer"
                style={{ boxShadow:'0 4px 20px rgba(245,196,0,0.3)' }}>
                🤖 ANALYSER AVEC L'IA
              </motion.button>
            )}

            {analyzing && (
              <div className="bg-surface border border-bord rounded-2xl p-5 text-center">
                <div className="text-2xl mb-2">🤖</div>
                <div className="font-bebas text-lg tracking-widest text-jaune mb-1">ANALYSE EN COURS</div>
                <div className="text-muted text-xs mb-4">{analyzeStep}</div>
                <div className="w-full bg-surface2 rounded-full h-1.5 overflow-hidden">
                  <motion.div className="h-full bg-jaune rounded-full"
                    animate={{ width: `${analyzeProgress}%` }}
                    transition={{ duration:0.5, ease:'easeOut' }} />
                </div>
              </div>
            )}

            <button onClick={() => setShowKeyModal(true)}
              className="w-full py-2.5 bg-surface2 border border-bord text-muted font-bebas tracking-widest rounded-xl cursor-pointer text-sm">
              ⚙️ CONFIGURER MA CLÉ IA
            </button>
          </div>
        )}

        {/* RESULT */}
        {result && (
          <motion.div
            className={`rounded-2xl p-5 border-2 ${result.already_have || result.matches?.length > 0 ? 'bg-red-500/8 border-red-500' : 'bg-green-500/8 border-green-500'}`}
            initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}>
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">{result.already_have || result.matches?.length > 0 ? '⚠️' : '✅'}</div>
              <div className={`font-bebas text-2xl tracking-widest ${result.already_have || result.matches?.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {result.already_have || result.matches?.length > 0 ? "TU L'AS DÉJÀ !" : "TU NE L'AS PAS !"}
              </div>
              <div className="text-muted text-sm mt-1">
                {result.verdict || (result.matches?.length > 0
                  ? `Tu as ${result.matches.length} écharpe${result.matches.length>1?'s':''} similaire${result.matches.length>1?'s':''}`
                  : 'Tu peux l\'acheter en toute confiance !')}
              </div>
              {result.description && <div className="text-argent text-xs mt-1 italic">🔍 {result.description}</div>}
            </div>
            {result.matches?.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {result.matches.map(s => (
                  <div key={s.id} className="bg-surface2 rounded-xl overflow-hidden border border-bord">
                    <div className="aspect-[4/3] flex items-center justify-center overflow-hidden">
                      {s.photo_url
                        ? <img src={s.photo_url} alt={s.Name} className="w-full h-full object-cover" />
                        : <span className="text-2xl">🧣</span>}
                    </div>
                    <div className="p-2 text-xs font-semibold truncate">{s.Name}</div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {result && (
          <motion.button whileTap={{ scale:0.97 }} onClick={reset}
            className="w-full py-3 bg-surface2 border border-bord text-white font-bebas tracking-widest rounded-2xl cursor-pointer">
            🔄 VÉRIFIER UNE AUTRE ÉCHARPE
          </motion.button>
        )}
      </div>

      {/* Key modal */}
      <AnimatePresence>
        {showKeyModal && (
          <div className="fixed inset-0 z-[500] flex items-end justify-center bg-noir/80"
            onClick={e => e.target === e.currentTarget && setShowKeyModal(false)}>
            <motion.div className="bg-surface border-t-2 border-jaune w-full max-w-[480px] rounded-t-3xl p-6"
              initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
              transition={{ type:'spring', damping:25, stiffness:300 }}>
              <div className="w-10 h-1 bg-bord rounded-full mx-auto mb-4" />
              <div className="text-center mb-4">
                <div className="text-3xl mb-2">🤖</div>
                <div className="font-bebas text-xl tracking-widest text-jaune">CLÉ API ANTHROPIC</div>
                <div className="text-muted text-xs mt-1">Sauvegardée uniquement sur ton appareil</div>
              </div>
              <input type="password"
                className="w-full bg-surface2 border border-bord rounded-xl px-4 py-3 text-white outline-none focus:border-jaune text-sm mb-2"
                placeholder="sk-ant-..."
                value={keyInput} onChange={e => { setKeyInput(e.target.value); setKeyError(false) }} />
              {keyError && <div className="text-red-400 text-xs mb-2">❌ Clé invalide</div>}
              <motion.button onClick={saveKey} whileTap={{ scale:0.97 }}
                className="w-full py-4 bg-jaune text-bleu2 font-bebas text-xl tracking-widest rounded-2xl cursor-pointer">
                ENREGISTRER
              </motion.button>
              {getAnthropicKey() && (
                <button onClick={() => { setAnthropicKey(''); setShowKeyModal(false) }}
                  className="w-full py-3 mt-2 text-red-400 text-sm cursor-pointer">
                  Supprimer la clé
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
