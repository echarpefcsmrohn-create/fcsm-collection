import { useState, useMemo, useDeferredValue } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection } from '../context/CollectionContext'
import ScarfCard from '../components/ScarfCard'
import SkeletonCard from '../components/SkeletonCard'
import PageHeader from '../components/PageHeader'
import { ERAS, ERA_ORDER } from '../lib/eras'
import ScarfDetail from '../components/ScarfDetail'
import PresentationMode from '../components/PresentationMode'

const SORTS = [
  { id:'date-desc', label:'📅 Récent' },
  { id:'date-asc',  label:'📅 Ancien' },
  { id:'era-asc',   label:'🏷 Ère ↑' },
  { id:'era-desc',  label:'🏷 Ère ↓' },
]

export default function CollectionPage() {
  const { collection, loading } = useCollection()
  const [search, setSearch] = useState('')
  const [filterEra, setFilterEra] = useState('all')
  const [sort, setSort] = useState('date-desc')
  const [selected, setSelected] = useState(null)
  const [showPresentation, setShowPresentation] = useState(false)

  // La frappe reste fluide : React affiche le champ immédiatement et
  // recalcule la grille avec un léger différé, sans bloquer la saisie.
  const deferredSearch = useDeferredValue(search)

  // Filtrage + tri recalculés uniquement quand un critère change,
  // au lieu d'à chaque render.
  const data = useMemo(() => {
    let d = collection
    if (filterEra !== 'all') d = d.filter(s => s.era === filterEra)
    if (deferredSearch) {
      const q = deferredSearch.toLowerCase()
      d = d.filter(s => s.Name?.toLowerCase().includes(q))
    }
    d = [...d]
    // Dates pré-converties une fois : évite un new Date() par comparaison
    if (sort === 'date-desc' || sort === 'date-asc') {
      const t = new Map(d.map(s => [s.id, new Date(s.added_at).getTime()]))
      d.sort((a, b) => sort === 'date-desc'
        ? t.get(b.id) - t.get(a.id)
        : t.get(a.id) - t.get(b.id))
    } else if (sort === 'era-asc') {
      d.sort((a, b) => ERA_ORDER.indexOf(a.era) - ERA_ORDER.indexOf(b.era))
    } else if (sort === 'era-desc') {
      d.sort((a, b) => ERA_ORDER.indexOf(b.era) - ERA_ORDER.indexOf(a.era))
    }
    return d
  }, [collection, filterEra, deferredSearch, sort])

  return (
    <div className="pb-24">
      <PageHeader title="MA COLLECTION">
    </PageHeader>

      {/* Search */}
      <div className="px-4 pt-3">
        <input
          className="w-full bg-surface2 border border-bord rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-jaune transition-colors"
          placeholder="🔍  Rechercher..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Era filters */}
      <div className="flex gap-2 px-4 pt-2 pb-1 overflow-x-auto no-scrollbar">
        {[{ id:'all', label:'Toutes' }, ...ERAS].map(era => (
          <motion.button key={era.id}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${filterEra === era.id ? 'bg-jaune text-bleu2 border-jaune' : 'bg-surface2 text-muted border-bord'}`}
            onClick={() => setFilterEra(era.id)}
            whileTap={{ scale: 0.95 }}
          >
            {era.label}
          </motion.button>
        ))}
      </div>

      {/* Sort */}
      {filterEra === 'all' && (
        <div className="flex gap-2 px-4 pb-2 overflow-x-auto no-scrollbar">
          {SORTS.map(s => (
            <motion.button key={s.id}
              className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${sort === s.id ? 'bg-jaune/10 border-jaune text-jaune' : 'bg-surface2 border-bord text-muted'}`}
              onClick={() => setSort(s.id)}
              whileTap={{ scale: 0.95 }}
            >
              {s.label}
            </motion.button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="px-4 pt-2">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <div className="text-5xl opacity-20 mb-3">🧣</div>
            <div className="font-bebas text-2xl tracking-widest">
              {search || filterEra !== 'all' ? 'Aucun résultat' : 'Collection vide'}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {data.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                // Le décalage ne s'applique qu'aux 8 premières cartes et est
                // plafonné à 0,16 s. Avant, `i * 0.04` donnait 4 s d'attente
                // sur la 100e carte — d'où les tuiles vides.
                transition={{ delay: Math.min(i, 8) * 0.02, duration: 0.2 }}
              >
                <ScarfCard scarf={s} onClick={setSelected} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <ScarfDetail
          scarf={selected}
          onClose={() => setSelected(null)}
          onPrev={() => {
            const idx = data.findIndex(s => s.id === selected.id)
            if (idx > 0) setSelected(data[idx - 1])
          }}
          onNext={() => {
            const idx = data.findIndex(s => s.id === selected.id)
            if (idx < data.length - 1) setSelected(data[idx + 1])
          }}
        />
      )}
      <AnimatePresence>
        {showPresentation && <PresentationMode scarves={data} onClose={() => setShowPresentation(false)} />}
      </AnimatePresence>
    </div>
  )
}
