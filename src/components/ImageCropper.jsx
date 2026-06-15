import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { motion } from 'framer-motion'

function getCroppedImg(imageSrc, pixelCrop) {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = pixelCrop.width
      canvas.height = pixelCrop.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height)
      canvas.toBlob(blob => resolve(new File([blob], 'cropped.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.9)
    }
    image.src = imageSrc
  })
}

export default function ImageCropper({ imageSrc, onCrop, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleCrop = async () => {
    const file = await getCroppedImg(imageSrc, croppedAreaPixels)
    onCrop(file)
  }

  return (
    <motion.div className="fixed inset-0 z-[600] flex flex-col"
      style={{ background: '#000' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

      {/* Cropper */}
      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={3 / 4}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: { background: '#000' },
            cropAreaStyle: { border: '2px solid #F5C400', boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)' }
          }}
        />
        {/* Guide text */}
        <div className="absolute top-12 left-0 right-0 text-center pointer-events-none">
          <div className="inline-block bg-noir/80 backdrop-blur-sm rounded-full px-4 py-1.5 text-jaune text-xs font-bebas tracking-widest">
            GLISSE ET PINCHE POUR RECADRER
          </div>
        </div>
      </div>

      {/* Zoom slider */}
      <div className="px-6 py-3 bg-noir flex items-center gap-3">
        <span className="text-muted text-xs">🔍</span>
        <input type="range" min={1} max={3} step={0.1} value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
          className="flex-1 accent-jaune" />
        <span className="text-muted text-xs">🔍+</span>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-3 px-4 pb-8 pt-2 bg-noir">
        <motion.button onClick={onCancel} whileTap={{ scale: 0.96 }}
          className="py-3.5 rounded-2xl border border-bord text-white font-bebas tracking-widest cursor-pointer">
          ANNULER
        </motion.button>
        <motion.button onClick={handleCrop} whileTap={{ scale: 0.96 }}
          className="py-3.5 rounded-2xl bg-jaune text-bleu2 font-bebas tracking-widest cursor-pointer">
          ROGNER ✓
        </motion.button>
      </div>
    </motion.div>
  )
}
