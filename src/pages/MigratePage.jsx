import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { getImageEmbedding, saveEmbedding } from '../lib/embeddings'
import PageHeader from '../components/PageHeader'

export default function MigratePage() {
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState([])
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: 0 })
  const [finished, setFinished] = useState(false)

  const log = (msg, type = 'info') => {
    setLogs(prev => [...prev.slice(-40), { msg, type, t: Date.now() }])
  }

  const runMigration = async () => {
    setRunning(true)
    setFinished(false)
    setLogs([])
    setProgress({ done: 0, total: 0, errors: 0 })

    try {
      log('📡 Récupération des écharpes sans embedding...')

      const { data: scarves, error } = await supabase
        .from('Scarves')
        .select('id, Name, photo_url, embedding')
        .is('embedding', null)
        .not('photo_url', 'is', null)

      if (error) throw error

      if (!scarves?.length) {
        log('✅ Toutes les écharpes ont déjà un embedding !', 'success')
        setFinished(true)
        setRunning(false)
        return
      }

      log(`🧣 ${scarves.length} écharpe(s) à traiter`)
      setProgress({ done: 0, total: scarves.length, errors: 0 })

      let done = 0
      let errors = 0

      for (const scarf of scarves) {
        try {
          log(`⏳ #${scarf.id} — ${scarf.Name?.slice(0, 30)}...`)
          const embedding = await getImageEmbedding(scarf.photo_url, 'document')
          await saveEmbedding(scarf.id, embedding)
          done++
          log(`✅ #${scarf.id} OK (${embedding.length} dims)`, 'success')
        } catch (e) {
          errors++
          log(`❌ #${scarf.id} — ${e.message?.slice(0, 60)}`, 'error')
        }
        setProgress({ done, total: scarves.length, errors })

        // Petite pause pour ne pas saturer le rate limit
        await new Promise(r => setTimeout(r, 300))
      }

      log(`🎉 Terminé : ${done} réussi(s), ${errors} erreur(s)`, 'success')
      setFinished(true)
    } catch (e) {
      log(`💥 Erreur fatale : ${e.message}`, 'error')
    }

    setRunning(false)
  }

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="pb-24">
      <PageHeader title="MIGRATION" subtitle="Calcul des empreintes visuelles 🧬" />

      <div className="px-4 pt-5 flex flex-col gap-4">

        <div className="bg-surface border border-bord rounded-2xl p-4">
          <div className="text-muted text-xs uppercase tracking-widest mb-2">À propos</div>
          <p className="text-sm text-white/80 leading-relaxed">
            Ce script calcule une empreinte visuelle (embedding Voyage AI) pour
            chaque écharpe de ta collection qui n'en a pas encore. C'est ce qui
            permettra de détecter les doublons <strong>par l'image</strong> et non par le texte.
          </p>
          <p className="text-muted text-xs mt-2">
            À lancer une seule fois. Les nouvelles écharpes seront traitées automatiquement à l'ajout.
          </p>
        </div>

        <motion.button
          onClick={runMigration}
          disabled={running}
          whileTap={{ scale: 0.97 }}
          className="w-full py-4 bg-jaune text-bleu2 font-bebas text-xl tracking-widest rounded-2xl cursor-pointer disabled:opacity-40">
          {running ? '⏳ MIGRATION EN COURS...' : '🚀 LANCER LA MIGRATION'}
        </motion.button>

        {progress.total > 0 && (
          <div className="bg-surface border border-bord rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted text-xs uppercase tracking-widest">Progression</span>
              <span className="font-bebas text-jaune text-lg">{pct}%</span>
            </div>
            <div className="h-2 bg-bord rounded-full overflow-hidden mb-2">
              <motion.div
                className="h-full bg-jaune rounded-full"
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted">{progress.done} / {progress.total} traitées</span>
              {progress.errors > 0 && (
                <span className="text-red-400">{progress.errors} erreur(s)</span>
              )}
            </div>
          </div>
        )}

        {logs.length > 0 && (
          <div className="bg-noir border border-bord rounded-2xl p-3 max-h-80 overflow-y-auto">
            <div className="text-muted text-xs uppercase tracking-widest mb-2 px-1">Logs</div>
            <div className="flex flex-col gap-1 font-mono">
              {logs.map((l, i) => (
                <div
                  key={i}
                  className={`text-[0.68rem] leading-snug px-1 ${
                    l.type === 'error' ? 'text-red-400'
                    : l.type === 'success' ? 'text-green-400'
                    : 'text-muted'
                  }`}>
                  {l.msg}
                </div>
              ))}
            </div>
          </div>
        )}

        {finished && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-500/10 border border-green-500/40 rounded-2xl p-4 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <div className="font-bebas text-xl tracking-widest text-green-400 mb-1">
              MIGRATION TERMINÉE
            </div>
            <div className="text-muted text-xs">
              La détection de doublons par image est maintenant active.
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
