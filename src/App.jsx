import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CollectionProvider, useCollection } from './context/CollectionContext'
import SplashScreen from './components/SplashScreen'
import BottomNav from './components/BottomNav'
import PullToRefresh from './components/PullToRefresh'
import HomePage from './pages/HomePage'
import CollectionPage from './pages/CollectionPage'
import VerifyPage from './pages/VerifyPage'
import StatsPage from './pages/StatsPage'
import DailyPage from './pages/DailyPage'
import AddModal from './components/AddModal'

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
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
            <AnimatePresence mode="wait">
              <motion.div
                key={page}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2 }}
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
    <CollectionProvider>
      <AppContent />
    </CollectionProvider>
  )
}
