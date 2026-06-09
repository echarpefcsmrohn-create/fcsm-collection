import { useState } from 'react'
import { motion } from 'framer-motion'
import { useCollection } from '../context/CollectionContext'
import { ERAS } from '../lib/eras'
import PageHeader from '../components/PageHeader'

export default function VerifyPage() {
  const { collection } = useCollection()
  const [mode, setMode] = useState('manuel')
  const [result, setResult] = useState(null)

  const runVerify = (eraId) => {
    const matches = collection.filter(s => s.era === eraId)
    setResult({ eraId, matches })
  }

  return (
    <div className="pb-24">
      <PageHeader title="VÉRIFIER" subtitle="Tu as déjà cette écharpe ?" />
      <div className="px-4 pt-5 flex flex-col gap-4">

        {/* Mode selector */}
        <div className="grid grid-cols-2 gap-2">
          {[{ id:'manuel', label:'🏷️ PAR ÈRE' }, { id:'ia', label:'🤖 IA AUTO' }].map(m => (
            <motion.button key={m.id} whileTap={{ scale:0.95 }}
              className={`py-3 rounded-2xl font-bebas text-base tracking-widest border cursor-pointer transition-colors ${mode === m.id ? 'bg-jaune/12 border-jaune text-jaune' : 'bg-surface2 border-bord text-muted'}`}
              onClick={() => { setMode(m.id); setResult(null) }}>
              {m.label}
            </motion.button>
          ))}
        </div>

        {/* Manuel mode */}
        {mode === 'manuel' && (
          <div className="bg-surface border border-bord rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-jaune flex items-center justify-center text-bleu2 text-xs font-black">1</div>
              <div className="font-bebas text-base tracking-widest text-jaune">IDENTIFIE LE LOGO SUR L'ÉCHARPE</div>
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

        {/* IA mode */}
        {mode === 'ia' && (
          <div className="bg-surface border border-bord rounded-2xl p-5 text-center">
            <div className="text-4xl mb-3">🤖</div>
            <div className="font-bebas text-lg tracking-widest text-jaune mb-2">MODE IA</div>
            <div className="text-muted text-sm">Configure ta clé API Anthropic pour activer l'analyse automatique</div>
          </div>
        )}

        {/* Result */}
        {result && (
          <motion.div
            className={`rounded-2xl p-5 border-2 ${result.matches.length > 0 ? 'bg-red-500/8 border-red-500' : 'bg-green-500/8 border-green-500'}`}
            initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}>
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">{result.matches.length > 0 ? '⚠️' : '✅'}</div>
              <div className={`font-bebas text-2xl tracking-widest ${result.matches.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {result.matches.length > 0 ? "TU L'AS DÉJÀ !" : "TU NE L'AS PAS !"}
              </div>
              <div className="text-muted text-sm mt-1">
                {result.matches.length > 0
                  ? `Tu as ${result.matches.length} écharpe${result.matches.length>1?'s':''} avec ce logo`
                  : "Tu peux l'acheter en toute confiance !"}
              </div>
            </div>
            {result.matches.length > 0 && (
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
          <motion.button whileTap={{ scale:0.97 }}
            className="w-full py-3 bg-surface2 border border-bord text-white font-bebas tracking-widest rounded-2xl cursor-pointer"
            onClick={() => setResult(null)}>
            🔄 VÉRIFIER UNE AUTRE ÉCHARPE
          </motion.button>
        )}
      </div>
    </div>
  )
}
