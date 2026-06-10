import { useState } from 'react'
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

  let data = [...collection]
  if (filterEra !== 'all') data = data.filter(s => s.era === filterEra)
  if (search) data = data.filter(s => s.Name?.toLowerCase().includes(search.toLowerCase()))
  if (sort === 'date-desc') data.sort((a,b) => new Date(b.added_at) - new Date(a.added_at))
  else if (sort === 'date-asc') data.sort((a,b) => new Date(a.added_at) - new Date(b.added_at))
  else if (sort === 'era-asc') data.sort((a,b) => ERA_ORDER.indexOf(a.era) - ERA_ORDER.indexOf(b.era))
  else if (sort === 'era-desc') data.sort((a,b) => ERA_ORDER.indexOf(b.era) - ERA_ORDER.indexOf(a.era))

  return (
    <div className="pb-24">
      <PageHeader title="MA COLLECTION">
        <motion.button
          className="flex items-center gap-1.5 bg-jaune/10 border border-jaune rounded-xl px-3 py-2 text-jaune font-bebas text-sm tracking-widest cursor-pointer"
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowPresentation(true)}
        >
          🖼️ PRÉSENTATION
        </motion.button>
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
          <motion.div className="grid grid-cols-2 gap-3" layout>
            <AnimatePresence>
              {data.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity:0, y:20 }}
                  animate={{ opacity:1, y:0 }}
                  exit={{ opacity:0, scale:0.9 }}
                  transition={{ delay: i * 0.04, duration:0.3 }}
                >
                  <ScarfCard scarf={s} onClick={setSelected} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
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
