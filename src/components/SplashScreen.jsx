import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollection } from '../context/CollectionContext'

const LOGO = ''

export default function SplashScreen({ onDone }) {
  const { loading, error } = useCollection()
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState('Initialisation...')

  useEffect(() => {
    setProgress(20)
    setStep('Connexion...')
  }, [])

  useEffect(() => {
    if (!loading && !error) {
      setProgress(100)
      setStep('Prêt ! 🦁')
      setTimeout(onDone, 700)
    }
    if (!loading && error) {
      setStep('Erreur de connexion')
      setProgress(100)
      setTimeout(onDone, 1500)
    }
    if (loading) {
      setProgress(50)
      setStep('Chargement de la collection...')
    }
  }, [loading, error])

  return (
    <motion.div
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-center gap-6"
      style={{ background: 'linear-gradient(150deg, #001f5c 0%, #002575 50%, #003494 100%)' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.img
        src={`data:image/png;base64,${LOGO}`}
        alt="FCSM"
        className="w-28 h-auto"
        style={{ filter: 'drop-shadow(0 0 20px rgba(245,196,0,0.4))' }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />
      <div className="text-center">
        <div className="font-bebas text-3xl tracking-[4px] text-jaune">MA COLLECTION</div>
        <div className="text-argent text-xs tracking-[3px] uppercase mt-1">FC Sochaux-Montbéliard</div>
      </div>
      <div className="flex flex-col items-center gap-2 w-52">
        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="h-full bg-jaune rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <div className="text-argent/70 text-xs tracking-wide">{step}</div>
      </div>
    </motion.div>
  )
}
