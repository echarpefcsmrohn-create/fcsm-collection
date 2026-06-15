import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function PhotoViewer({ src, onClose }) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const lastTap = useRef(0)
  const lastDistance = useRef(null)
  const lastMidpoint = useRef(null)
  const lastPosition = useRef(null)
  const isDragging = useRef(false)
  const scaleRef = useRef(1)
  const positionRef = useRef({ x: 0, y: 0 })
  const containerRef = useRef()

  const resetView = () => {
    scaleRef.current = 1
    positionRef.current = { x: 0, y: 0 }
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  // Double tap to zoom at tap point
  const handleTap = useCallback((e) => {
    const now = Date.now()
    if (now - lastTap.current < 300) {
      if (scaleRef.current > 1) {
        resetView()
      } else {
        const rect = containerRef.current.getBoundingClientRect()
        const touch = e.changedTouches ? e.changedTouches[0] : e
        // Point de tap relatif au centre du conteneur
        const tapX = touch.clientX - rect.left - rect.width / 2
        const tapY = touch.clientY - rect.top - rect.height / 2
        const newScale = 3
        // On déplace pour centrer sur le point tappé
        const newX = -tapX * (newScale - 1)
        const newY = -tapY * (newScale - 1)
        scaleRef.current = newScale
        positionRef.current = { x: newX, y: newY }
        setScale(newScale)
        setPosition({ x: newX, y: newY })
      }
      lastTap.current = 0
    } else {
      lastTap.current = now
    }
  }, [])

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastDistance.current = Math.sqrt(dx * dx + dy * dy)
      // Midpoint entre les deux doigts
      lastMidpoint.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      }
      isDragging.current = false
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
      const ratio = distance / lastDistance.current

      // Nouveau midpoint
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2
      const rect = containerRef.current.getBoundingClientRect()

      // Point de zoom relatif au centre du conteneur
      const originX = midX - rect.left - rect.width / 2
      const originY = midY - rect.top - rect.height / 2

      const oldScale = scaleRef.current
      const newScale = Math.min(Math.max(oldScale * ratio, 1), 5)

      // Ajuster la position pour zoomer au point des doigts
      const scaleChange = newScale - oldScale
      const newX = positionRef.current.x - originX * scaleChange
      const newY = positionRef.current.y - originY * scaleChange

      scaleRef.current = newScale
      positionRef.current = { x: newX, y: newY }
      setScale(newScale)
      setPosition({ x: newX, y: newY })

      lastDistance.current = distance
      lastMidpoint.current = { x: midX, y: midY }
    } else if (e.touches.length === 1 && isDragging.current && scaleRef.current > 1) {
      const dx = e.touches[0].clientX - lastPosition.current.x
      const dy = e.touches[0].clientY - lastPosition.current.y
      const newPos = {
        x: positionRef.current.x + dx,
        y: positionRef.current.y + dy,
      }
      positionRef.current = newPos
      setPosition(newPos)
      lastPosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      lastDistance.current = null
      lastMidpoint.current = null
    }
    if (e.touches.length === 0) {
      isDragging.current = false
      if (scaleRef.current < 1.1) resetView()
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        className="fixed inset-0 z-[500] flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.97)', touchAction: 'none' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onTouchEnd={handleTap}
        onClick={e => { if (e.target === e.currentTarget && scaleRef.current === 1) onClose() }}>

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
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              transition: isDragging.current ? 'none' : 'transform 0.15s ease',
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
