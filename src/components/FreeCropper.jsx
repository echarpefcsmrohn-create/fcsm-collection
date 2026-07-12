import { useState, useRef, useCallback } from 'react'
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { motion } from 'framer-motion'

/**
 * Recadrage LIBRE — pas de ratio fixe.
 * L'utilisateur étire le cadre en largeur ET hauteur indépendamment,
 * utile pour isoler une écharpe longue et fine du fond parasite.
 */
export default function FreeCropper({ imageSrc, onDone, onCancel }) {
  const imgRef = useRef(null)
  const [crop, setCrop] = useState()
  const [completedCrop, setCompletedCrop] = useState(null)

  const onImageLoad = useCallback((e) => {
    const { width, height } = e.currentTarget
    // Cadre initial : 80% de l'image, centré, sans contrainte de ratio
    const initialCrop = centerCrop(
      {
        unit: '%',
        width: 80,
        height: 80,
      },
      width,
      height
    )
    setCrop(initialCrop)
    setCompletedCrop(initialCrop)
  }, [])

  const getCroppedFile = async () => {
    const image = imgRef.current
    if (!image || !completedCrop) return null

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    const canvas = document.createElement('canvas')
    const cropWidthPx = completedCrop.width * scaleX
    const cropHeightPx = completedCrop.height * scaleY
    canvas.width = cropWidthPx
    canvas.height = cropHeightPx

    const ctx = canvas.getContext('2d')
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      cropWidthPx,
      cropHeightPx,
      0, 0,
      cropWidthPx,
      cropHeightPx
    )

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) { resolve(null); return }
        const file = new File([blob], 'crop.jpg', { type: 'image/jpeg' })
        resolve(file)
      }, 'image/jpeg', 0.92)
    })
  }

  const handleValidate = async () => {
    const file = await getCroppedFile()
    if (file) onDone(file, URL.createObjectURL(file))
  }

  return (
    <div className="fixed inset-0 z-[600] flex flex-col bg-noir">
      <div className="flex items-center justify-between px-5 py-4 border-b border-bord">
        <button onClick={onCancel} className="text-muted text-sm cursor-pointer">Annuler</button>
        <div className="font-bebas text-lg tracking-widest text-jaune">CADRER L'ÉCHARPE</div>
        <button onClick={handleValidate} className="text-jaune font-bebas text-sm tracking-widest cursor-pointer">
          VALIDER
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-hidden p-3">
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          onComplete={(c) => setCompletedCrop(c)}
          // Pas de "aspect" prop = ratio totalement libre
          className="max-h-full"
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt=""
            onLoad={onImageLoad}
            style={{ maxHeight: '70vh', maxWidth: '100%' }}
          />
        </ReactCrop>
      </div>

      <div className="px-5 pb-6 pt-2 text-center">
        <p className="text-muted text-xs">
          Étire les poignées pour cadrer précisément l'écharpe — largeur et hauteur libres.
        </p>
      </div>
    </div>
  )
}
