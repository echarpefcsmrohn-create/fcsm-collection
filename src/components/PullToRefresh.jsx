import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false)
  const [progress, setProgress] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(null)
  const containerRef = useRef()
  const THRESHOLD = 80

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) startY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e) => {
    if (startY.current === null) return
    const diff = e.touches[0].clientY - startY.current
    if (diff > 0 && window.scrollY === 0) {
      setPulling(true)
      setProgress(Math.min(diff / THRESHOLD, 1))
    }
  }

  const handleTouchEnd = async () => {
    if (progress >= 1 && !refreshing) {
      setRefreshing(true)
      setPulling(false)
      setProgress(0)
      try { await onRefresh() } finally {
        setRefreshing(false)
      }
    } else {
      setPulling(false)
      setProgress(0)
    }
    startY.current = null
  }

  return (
    <div ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative">

      {/* Pull indicator */}
      <AnimatePresence>
        {(pulling || refreshing) && (
          <motion.div
            className="absolute top-0 left-0 right-0 flex justify-center z-50 pointer-events-none"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ paddingTop: pulling ? `${progress * 60}px` : '8px' }}>
            <div className="bg-jaune rounded-full p-2 shadow-lg">
              <motion.div
                animate={refreshing ? { rotate: 360 } : { rotate: progress * 180 }}
                transition={refreshing ? { duration:0.8, repeat:Infinity, ease:'linear' } : { duration:0 }}>
                <svg className="w-5 h-5 text-bleu2" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {children}
    </div>
  )
}
