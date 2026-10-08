import { motion } from 'framer-motion'
import { playNav, vibrate } from '../lib/sounds'

const navItems = [
  { id:'home', label:'Accueil', icon: (
    <svg fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" viewBox="0 0 24 24" className="w-6 h-6">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  )},
  { id:'collection', label:'Collection', icon: (
    <svg fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" viewBox="0 0 24 24" className="w-6 h-6">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )},
  { id:'add', label:'Ajouter', icon: null },
  { id:'verify', label:'Vérifier', icon: (
    <svg fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" viewBox="0 0 24 24" className="w-6 h-6">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )},
  { id:'stats', label:'Stats', icon: (
    <svg fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" viewBox="0 0 24 24" className="w-6 h-6">
      <path d="M18 20V10M12 20V4M6 20v-6"/>
    </svg>
  )},
]

export default function BottomNav({ current, onNavigate, onAdd }) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] border-t-[3px] border-jaune flex z-50 safe-bottom"
      style={{ background: '#06103A' }}>
      {navItems.map(item => {
        if (item.id === 'add') return (
          <div key="add" className="flex-1 flex flex-col items-center justify-center cursor-pointer relative -top-4" onClick={onAdd}>
            <motion.div
              className="w-14 h-14 bg-jaune rounded-full flex items-center justify-center"
              style={{ border: '4px solid #06103A', boxShadow: '0 0 0 3px #F4EFE0' }}
              whileTap={{ scale: 0.88 }}
            >
              <svg fill="none" stroke="#0B1B5A" strokeWidth="3" viewBox="0 0 24 24" className="w-6 h-6">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </motion.div>
            <span className="label-retro text-argent/70 text-[0.5rem] mt-2">Ajouter</span>
          </div>
        )
        const isActive = current === item.id
        return (
          <motion.button
            key={item.id}
            className={`flex-1 flex flex-col items-center gap-0.5 py-3 border-none bg-transparent cursor-pointer ${isActive ? 'text-jaune' : 'text-argent/70'}`}
            onClick={() => { playNav(); vibrate([8]); onNavigate(item.id) }}
            whileTap={{ scale: 0.9 }}
          >
            <span>{item.icon}</span>
            <span className="label-retro text-[0.5rem]">{item.label}</span>
          </motion.button>
        )
      })}
    </nav>
  )
}
