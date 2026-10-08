import { useState } from 'react'

/**
 * Logo du club pour une ère donnée.
 * Le fichier se dépose dans public/eras/<id-de-l-ère>.png (ex : 1994-1997.png).
 * Si le fichier n'existe pas, rien ne s'affiche : aucun trou dans l'interface.
 */
export default function EraLogo({ id, size = 20, className = '' }) {
  const [missing, setMissing] = useState(false)
  if (!id || id === 'all' || missing) return null
  return (
    <img
      src={`/eras/${id}.png`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setMissing(true)}
      className={`object-contain flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
