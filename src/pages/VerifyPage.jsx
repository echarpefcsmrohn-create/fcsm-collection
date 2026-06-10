import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection } from '../context/CollectionContext'
import { ERAS, ERA_LOGOS, getScarfNumber } from '../lib/eras'
import PageHeader from '../components/PageHeader'
import { compressImage } from '../lib/cloudinary'

const PROXY_URL = 'https://fcsm-ai-proxy.echarpe-fcsm-rohn.workers.dev/'

function getAnthropicKey() { return localStorage.getItem('fcsm_anthropic_key') || '' }
function setAnthropicKey(k) { localStorage.setItem('fcsm_anthropic_key', k) }

export default function VerifyPage() {
  const { collection } = useCollection()
  const [mode, setMode] = useState('manuel')
  const [result, setResult] = useState(null)
  const [iaPhoto, setIaPhoto] = useState(null)
  const [iaFile, setIaFile] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeStep, setAnalyzeStep] = useState('')
  const [analyzeProgress, setAnalyzeProgress] = useState(0)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const fileRef = useRef()
  const cameraRef = useRef()

  const runVerify = (eraId) => {
    const matches = collection.filter(s => s.era === eraId)
    setResult({ type: 'manuel', eraId, matches })
  }

  const handleIAPhoto = (file) => {
    if (!file) return
    setIaFile(file)
    setIaPhoto(URL.createObjectURL(file))
    setResult(null)
  }

  const analyzeWithAI = async () => {
    if (!iaFile) return
    const key = getAnthropicKey()
    if (!key) { setShowKeyModal(true); return }

    setAnalyzing(true)
    setAnalyzeStep('🗜️ Compression de la photo...'); setAnalyzeProgress(15)
    try {
      const compressed = await compressImage(iaFile, 600)
      const b64 = await new Promise(res => {
        const r = new FileReader()
        r.onload = e => res(e.target.result.split(',')[1])
        r.readAsDataURL(compressed)
      })

      setAnalyzeStep('📡 Envoi au serveur IA...'); setAnalyzeProgress(40)
      const scarfsDesc = collection.map((s,i) => `${i+1}. "${s.Name}" (ere: ${s.era||'?'})`).join('\n')

      const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'x-api-key': key, 'anthropic-version':'2023-06-01' },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 400,
          system: 'Tu reponds UNIQUEMENT en JSON valide, sans texte autour.',
          messages: [{ role:'user', content: [
            { type:'image', source:{ type:'base64', media_type:'image/jpeg', data:b64 } },
            { type:'text', text:`Ma collection FCSM:\n${scarfsDesc}\n\nCette echarpe ressemble-t-elle a une de ma liste ? JSON: {"already_have":false,"similar_scarfs":[],"verdict":""}` }
          ]}]
        })
      })

      setAnalyzeStep('🤖 Claude analyse...'); setAnalyzeProgress(70)
      if (!response.ok) throw new Error('API error ' + response.status)
      const data = await response.json()
      const text = data.content[0].text
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON')

      setAnalyzeStep('🔎 Comparaison...'); setAnalyzeProgress(90)
      await new Promise(r => setTimeout(r, 400))

      const res = JSON.parse(jsonMatch[0])
      const matches = (res.similar_scarfs || []).map(i => collection[i-1]).filter(Boolean)
      setResult({ type: 'ia', already_have: res.already_have, matches, verdict: res.verdict })
      setAnalyzeProgress(100)
    } catch(e) {
      console.error(e)
      setResult({ type: 'error', msg: e.message })
    } finally {
      setAnalyzing(false)
      setAnalyzeStep('')
    }
  }

  return (
    <div className="pb-24">
      <PageHeader title="VÉRIFIER" subtitle="Tu as déjà cette écharpe ?" />
      <div className="px-4 pt-4 flex flex-col gap-4">

        {/* Mode tabs */}
        <div className="grid grid-cols-2 gap-2">
          {[{id:'manuel',label:'🏷️ PAR ÈRE'},{id:'ia',label:'🤖 IA AUTO'}].map(m => (
            <motion.button key={m.id} whileTap={{scale:0.95}}
              className={`py-3 rounded-2xl font-bebas text-base tracking-widest border cursor-pointer transition-colors ${mode===m.id?'bg-jaune/12 border-jaune text-jaune':'bg-surface2 border-bord text-muted'}`}
              onClick={() => { setMode(m.id); setResult(null) }}>
              {m.label}
            </motion.button>
          ))}
        </div>

        {/* Manuel */}
        {mode === 'manuel' && (
          <div className="bg-surface border border-bord rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-jaune flex items-center justify-center text-bleu2 text-xs font-black">1</div>
              <span className="font-bebas tracking-widest text-jaune text-sm">IDENTIFIE LE LOGO SUR L'ÉCHARPE</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ERAS.map(e => (
                <motion.button key={e.id} whileTap={{scale:0.93}}
                  className={`py-2 rounded-xl border text-[0.65rem] font-semibold cursor-pointer transition-colors flex flex-col items-center gap-1 ${result?.eraId===e.id?'bg-jaune/15 border-jaune text-jaune':'bg-surface2 border-bord text-muted'}`}
                  onClick={() => runVerify(e.id)}>
                  {ERA_LOGOS[e.id] && <img src={`data:image/jpeg;base64,${ERA_LOGOS[e.id]}`} alt="" className="w-8 h-8 object-contain rounded" />}
                  {e.label}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* IA */}
        {mode === 'ia' && (
          <div className="flex flex-col gap-3">
            <div className="bg-surface border border-bord rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-jaune flex items-center justify-center text-bleu2 text-xs font-black">1</div>
                <span className="font-bebas tracking-widest text-jaune text-sm">PRENDS UNE PHOTO DE L'ÉCHARPE</span>
              </div>
              <div className="aspect-[4/3] bg-surface2 border-2 border-dashed border-bord rounded-xl overflow-hidden relative flex items-center justify-center cursor-pointer mb-3"
                onClick={() => fileRef.current?.click()}>
                {iaPhoto
                  ? <img src={iaPhoto} alt="" className="w-full h-full object-cover" />
                  : <div className="text-center text-muted"><div className="text-3xl mb-2">📷</div><div className="text-xs">Galerie ou caméra</div></div>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => cameraRef.current?.click()}
                  className="py-2.5 rounded-xl border border-bord bg-surface2 text-sm text-white cursor-pointer active:border-jaune">📷 Caméra</button>
                <button onClick={() => fileRef.current?.click()}
                  className="py-2.5 rounded-xl border border-bord bg-surface2 text-sm text-white cursor-pointer active:border-jaune">🖼️ Galerie</button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleIAPhoto(e.target.files[0])} />
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleIAPhoto(e.target.files[0])} />
            </div>

            {iaPhoto && !analyzing && !result && (
              <motion.button onClick={analyzeWithAI} whileTap={{scale:0.97}}
                className="w-full py-4 bg-jaune text-bleu2 font-bebas text-xl tracking-widest rounded-2xl cursor-pointer">
                🤖 ANALYSER AVEC L'IA
              </motion.button>
            )}

            {analyzing && (
              <div className="bg-surface border border-bord rounded-2xl p-5 flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 border-bord border-t-jaune rounded-full animate-spin-slow" />
                <div className="font-bebas text-jaune tracking-widest">{analyzeStep}</div>
                <div className="w-full bg-surface2 rounded-full h-1.5 overflow-hidden">
                  <motion.div className="h-full bg-jaune rounded-full"
                    animate={{width:`${analyzeProgress}%`}} transition={{duration:0.4}} />
                </div>
              </div>
            )}

            <button onClick={() => setShowKeyModal(true)}
              className="text-muted text-xs text-center py-2 cursor-pointer hover:text-jaune transition-colors">
              ⚙️ {getAnthropicKey() ? 'Modifier ma clé IA' : 'Configurer ma clé IA'}
            </button>
          </div>
        )}

        {/* Result */}
        <AnimatePresence>
          {result && result.type !== 'error' && (
            <motion.div
              className={`rounded-2xl p-5 border-2 ${result.matches?.length > 0 ? 'bg-red-500/8 border-red-500/60' : 'bg-green-500/8 border-green-500/60'}`}
              initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
              <div className="text-center mb-4">
                <div className="text-3xl mb-2">{result.matches?.length > 0 ? '⚠️' : '✅'}</div>
                <div className={`font-bebas text-2xl tracking-widest ${result.matches?.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {result.matches?.length > 0 ? "TU L'AS DÉJÀ !" : "TU NE L'AS PAS !"}
                </div>
                {result.verdict && <div className="text-muted text-sm mt-1">{result.verdict}</div>}
                {!result.verdict && result.matches?.length > 0 && (
                  <div className="text-muted text-sm mt-1">{result.matches.length} écharpe{result.matches.length>1?'s':''} similaire{result.matches.length>1?'s':''}</div>
                )}
              </div>
              {result.matches?.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {result.matches.map(s => (
                    <div key={s.id} className="bg-surface2 rounded-xl overflow-hidden border border-bord">
                      <div className="aspect-[4/3] flex items-center justify-center overflow-hidden">
                        {s.photo_url ? <img src={s.photo_url} alt={s.Name} className="w-full h-full object-cover" /> : <span className="text-2xl">🧣</span>}
                      </div>
                      <div className="p-2 text-xs font-semibold truncate">#{getScarfNumber(s, collection)} {s.Name}</div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
          {result?.type === 'error' && (
            <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-4 text-center text-red-400 text-sm">
              ❌ Erreur : {result.msg}
            </div>
          )}
        </AnimatePresence>

        {result && (
          <motion.button whileTap={{scale:0.97}}
            className="w-full py-3 bg-surface2 border border-bord text-white font-bebas tracking-widest rounded-2xl cursor-pointer"
            onClick={() => { setResult(null); setIaPhoto(null); setIaFile(null) }}>
            🔄 VÉRIFIER UNE AUTRE ÉCHARPE
          </motion.button>
        )}
      </div>

      {/* Key modal */}
      <AnimatePresence>
        {showKeyModal && (
          <div className="fixed inset-0 z-[400] bg-noir/90 flex items-end justify-center"
            onClick={e => e.target === e.currentTarget && setShowKeyModal(false)}>
            <motion.div className="w-full max-w-[480px] bg-surface border-t-2 border-jaune rounded-t-3xl p-5 pb-8"
              initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} transition={{type:'spring',damping:28}}>
              <div className="font-bebas text-xl tracking-widest text-jaune mb-4">CLÉ API ANTHROPIC</div>
              <input type="password" className="w-full bg-surface2 border border-bord rounded-xl px-4 py-3 text-white outline-none focus:border-jaune mb-3"
                placeholder="sk-ant-..." value={keyInput} onChange={e => setKeyInput(e.target.value)} />
              <button onClick={() => { setAnthropicKey(keyInput); setShowKeyModal(false) }}
                className="w-full py-3 bg-jaune text-bleu2 font-bebas tracking-widest rounded-xl cursor-pointer">
                ENREGISTRER
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
