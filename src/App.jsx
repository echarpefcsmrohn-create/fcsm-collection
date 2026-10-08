import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CollectionProvider, useCollection } from './context/CollectionContext'
import { ThemeProvider } from './context/ThemeContext'
import SplashScreen from './components/SplashScreen'
import BottomNav from './components/BottomNav'
import PullToRefresh from './components/PullToRefresh'
import HomePage from './pages/HomePage'
import CollectionPage from './pages/CollectionPage'
import VerifyPage from './pages/VerifyPage'
import StatsPage from './pages/StatsPage'
import DailyPage from './pages/DailyPage'
import AddModal from './components/AddModal'

// Transition courte, sans attente de sortie : la nouvelle page s'affiche tout de suite
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
}

function AppContent() {
  const [splashDone, setSplashDone] = useState(false)
  const [page, setPage] = useState('home')
  const [showAdd, setShowAdd] = useState(false)
  const { load } = useCollection()

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-noir overflow-x-hidden">
      <AnimatePresence>
        {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
      </AnimatePresence>

      {splashDone && (
        <>
          <PullToRefresh onRefresh={load}>
            <AnimatePresence initial={false}>
              <motion.div
                key={page}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                                transition={{ duration: 0.12 }}
              >
                {page === 'home' && <HomePage onNavigate={setPage} />}
                {page === 'collection' && <CollectionPage />}
                {page === 'verify' && <VerifyPage />}
                {page === 'stats' && <StatsPage />}
                {page === 'daily' && <DailyPage />}
              </motion.div>
            </AnimatePresence>
          </PullToRefresh>

          <BottomNav current={page} onNavigate={setPage} onAdd={() => setShowAdd(true)} />
          <AddModal open={showAdd} onClose={() => setShowAdd(false)} />
        </>
      )}
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <CollectionProvider>
        <AppContent />
      </CollectionProvider>
    </ThemeProvider>
  )
}
