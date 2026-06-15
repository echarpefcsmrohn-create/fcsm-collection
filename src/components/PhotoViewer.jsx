import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function PhotoViewer({ src, onClose }) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const lastTap = useRef(0)
  const lastDistance = useRef(null)
  const lastPosition = useRef(null)
  const isDragging = useRef(false)

  const resetView = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  // Double tap to zoom
  const handleTap = useCallback((e) => {
    const now = Date.now()
    const DOUBLE_TAP_DELAY = 300
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Double tap
      if (scale > 1) {
        resetView()
      } else {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.changedTouches ? e.changedTouches[0].clientX : e.clientX
        const y = e.changedTouches ? e.changedTouches[0].clientY : e.clientY
        const offsetX = (x - rect.left - rect.width / 2) * -1.5
        const offsetY = (y - rect.top - rect.height / 2) * -1.5
        setScale(3)
        setPosition({ x: offsetX, y: offsetY })
      }
      lastTap.current = 0
    } else {
      lastTap.current = now
    }
  }, [scale])

  // Pinch to zoom
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastDistance.current = Math.sqrt(dx * dx + dy * dy)
    } else if (e.touches.length === 1) {
      lastPosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      isDragging.current = true
    }
  }

  const handleTouchMove = (e) => {
    e.preventDefault()
    if (e.touches.length === 2 && lastDistance.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const distance = Math.sqrt(dx * dx + dy * dy)
      const delta = distance / lastDistance.current
      setScale(s => Math.min(Math.max(s * delta, 1), 5))
      lastDistance.current = distance
    } else if (e.touches.length === 1 && isDragging.current && scale > 1) {
      const dx = e.touches[0].clientX - lastPosition.current.x
      const dy = e.touches[0].clientY - lastPosition.current.y
      setPosition(p => ({ x: p.x + dx, y: p.y + dy }))
      lastPosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }

  const handleTouchEnd = (e) => {
    lastDistance.current = null
    isDragging.current = false
    // If zoomed out below 1, reset
    if (scale < 1.1) resetView()
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[500] flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.97)', touchAction: 'none' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onTouchEnd={handleTap}
        onClick={e => { if (e.target === e.currentTarget && scale === 1) onClose() }}>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center text-lg cursor-pointer">
          ✕
        </button>

        {/* Zoom indicator */}
        {scale > 1 && (
          <div className="absolute top-4 left-4 z-10 bg-black/50 rounded-full px-3 py-1 text-white text-xs">
            {Math.round(scale * 100)}%
          </div>
        )}

        {/* Reset button when zoomed */}
        {scale > 1 && (
          <button onClick={resetView}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 bg-white/10 text-white text-xs rounded-full px-4 py-2 cursor-pointer">
            Réinitialiser
          </button>
        )}

        {/* Photo */}
        <div className="w-full h-full flex items-center justify-center overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}>
          <motion.img
            src={src}
            alt=""
            className="max-w-full max-h-full object-contain select-none"
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              transition: isDragging.current ? 'none' : 'transform 0.2s ease',
              cursor: scale > 1 ? 'grab' : 'zoom-in',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
            draggable={false}
          />
        </div>

        {/* Hint */}
        {scale === 1 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/30 text-xs text-center">
            Double tap pour zoomer · Pincement pour ajuster
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
