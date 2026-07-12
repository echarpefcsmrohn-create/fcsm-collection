import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useCollection } from '../context/CollectionContext'
import { ERAS, getScarfNumber } from '../lib/eras'
import PageHeader from '../components/PageHeader'
import { checkVisualDuplicate } from '../lib/embeddings'

export default function VerifyPage() {
  const { collection } = useCollection()
  const [mode, setMode] = useState('manuel')
  const [result, setResult] = useState(null)

  const [iaPhoto, setIaPhoto] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeStep, setAnalyzeStep] = useState('')
  const [analyzeProgress, setAnalyzeProgress] = useState(0)
  const iaFileRef = useRef()
  const iaCameraRef = useRef()

  const runVerify = (eraId) => {
    const matches = collection.filter(s => s.era === eraId)
    setResult({ type: 'manuel', eraId, matches })
  }

  const handleIaPhoto = (file) => {
    if (!file) return
    setIaPhoto(URL.createObjectURL(file))
    setResult(null)
    setAnalyzeStep('')
    setAnalyzeProgress(0)
  }

  const analyzeVisual = async () => {
    if (!iaPhoto) return

    setAnalyzing(true)
    setAnalyzeProgress(20)
    setAnalyzeStep('🧬 Calcul de l\'empreinte visuelle...')

    try {
      setAnalyzeProgress(50)
      setAnalyzeStep('📡 Comparaison avec ta collection...')

      // Seuil 0.89 : ne remonte que les vrais doublons.
      // En dessous, ce sont juste des ecarpes FCSM au style proche.
      const { matches } = await checkVisualDuplicate(iaPhoto, 0.89)

      setAnalyzeProgress(90)
      await new Promise(r => setTimeout(r, 300))

      if (matches.length > 0) {
        const best = matches[0]
        const pct = Math.round(best.similarity * 100)
        const num = getScarfNumber(best, collection)

        setResult({
          type: 'ia',
          already_have: pct >= 90,
          matches,
          verdict: pct >= 90
            ? `C'est l'écharpe #${num} de ta collection — ${pct}% de ressemblance visuelle.`
            : `Écharpe proche trouvée : #${num} à ${pct}%. À vérifier de près, ce n'est peut-être pas la même.`,
        })
      } else {
        setResult({
          type: 'ia',
          already_have: false,
          matches: [],
          verdict: 'Aucune écharpe visuellement similaire dans ta collection.',
        })
      }

      setAnalyzeProgress(100)
    } catch (e) {
      console.error(e)
      setAnalyzeStep('❌ ' + e.message)
      setTimeout(() => setAnalyzeStep(''), 4000)
    }

    setAnalyzing(false)
  }

  const reset = () => {
    setResult(null); setIaPhoto(null)
    setAnalyzeStep(''); setAnalyzeProgress(0)
  }

  const hasMatch = result?.already_have || result?.matches?.length > 0

  return (
    <div className="pb-24">
      <PageHeader title="VÉRIFIER" subtitle="Tu as déjà cette écharpe ?" />
      <div className="px-4 pt-5 flex flex-col gap-4">

        {/* Mode selector */}
        <div className="grid grid-cols-2 gap-2">
          {[{ id:'manuel', label:'🏷️ PAR ÈRE' }, { id:'ia', label:'🧬 PAR IMAGE' }].map(m => (
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

        {/* MODE IMAGE */}
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
                  : <>
                      <span className="text-3xl">📷</span>
                      <span className="text-muted text-sm">Galerie ou caméra</span>
                      <span className="text-jaune text-xs">Comparaison visuelle réelle</span>
                    </>}
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
              <input ref={iaFileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { handleIaPhoto(e.target.files[0]); e.target.value='' }} />
              <input ref={iaCameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => { handleIaPhoto(e.target.files[0]); e.target.value='' }} />
            </div>

            {iaPhoto && !analyzing && !result && (
              <motion.button onClick={analyzeVisual} whileTap={{ scale:0.97 }}
                className="w-full py-4 bg-jaune text-bleu2 font-bebas text-xl tracking-widest rounded-2xl cursor-pointer"
                style={{ boxShadow:'0 4px 20px rgba(245,196,0,0.3)' }}>
                🧬 COMPARER VISUELLEMENT
              </motion.button>
            )}

            {analyzing && (
              <div className="bg-surface border border-bord rounded-2xl p-5 text-center">
                <div className="text-2xl mb-2">🧬</div>
                <div className="font-bebas text-lg tracking-widest text-jaune mb-1">ANALYSE VISUELLE</div>
                <div className="text-muted text-xs mb-4">{analyzeStep}</div>
                <div className="w-full bg-surface2 rounded-full h-1.5 overflow-hidden">
                  <motion.div className="h-full bg-jaune rounded-full"
                    animate={{ width: `${analyzeProgress}%` }}
                    transition={{ duration:0.4, ease:'easeOut' }} />
                </div>
              </div>
            )}

            {!analyzing && analyzeStep.startsWith('❌') && (
              <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-3 text-center">
                <div className="text-red-400 text-xs">{analyzeStep}</div>
              </div>
            )}
          </div>
        )}

        {/* RESULT */}
        {result && (
          <motion.div
            className={`rounded-2xl p-5 border-2 ${hasMatch ? 'bg-red-500/8 border-red-500' : 'bg-green-500/8 border-green-500'}`}
            initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}>
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">{hasMatch ? '⚠️' : '✅'}</div>
              <div className={`font-bebas text-2xl tracking-widest ${hasMatch ? 'text-red-400' : 'text-green-400'}`}>
                {result.already_have ? "TU L'AS DÉJÀ !"
                  : result.matches?.length > 0 ? "ÉCHARPE PROCHE TROUVÉE"
                  : "TU NE L'AS PAS !"}
              </div>
              <div className="text-muted text-sm mt-1">
                {result.verdict || (result.matches?.length > 0
                  ? `Tu as ${result.matches.length} écharpe${result.matches.length>1?'s':''} de cette ère`
                  : 'Tu peux l\'acheter en toute confiance !')}
              </div>
            </div>

            {result.matches?.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {result.matches.map(s => (
                  <div key={s.id} className="bg-surface2 rounded-xl overflow-hidden border border-bord relative">
                    {/* Badge % de similarité (mode image seulement) */}
                    {s.similarity != null && (
                      <div className="absolute top-1.5 right-1.5 z-10 bg-noir/85 rounded-full px-2 py-0.5">
                        <span className={`font-bebas text-xs ${
                          s.similarity >= 0.92 ? 'text-red-400'
                          : s.similarity >= 0.90 ? 'text-orange-400'
                          : 'text-jaune'
                        }`}>
                          {Math.round(s.similarity * 100)}%
                        </span>
                      </div>
                    )}
                    <div className="aspect-[4/3] flex items-center justify-center overflow-hidden">
                      {s.photo_url
                        ? <img src={s.photo_url} alt={s.Name} className="w-full h-full object-cover" />
                        : <span className="text-2xl">🧣</span>}
                    </div>
                    <div className="px-2 pt-1.5 text-[0.6rem] font-bebas text-jaune tracking-wide">
                      #{getScarfNumber(s, collection)}
                    </div>
                    <div className="px-2 pb-2 text-xs font-semibold truncate">{s.Name}</div>
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
    </div>
  )
}
