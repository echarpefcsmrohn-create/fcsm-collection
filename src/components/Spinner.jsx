export default function Spinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8'
  return (
    <div className={`${s} border-2 border-bord border-t-jaune rounded-full animate-spin-slow`} />
  )
}
