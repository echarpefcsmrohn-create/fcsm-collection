export default function SkeletonCard() {
  return (
    <div className="bg-surface border border-bord rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-surface2" />
      <div className="p-2.5 pb-3 space-y-2">
        <div className="h-2.5 bg-surface2 rounded w-1/3" />
        <div className="h-3.5 bg-surface2 rounded w-4/5" />
        <div className="h-2.5 bg-surface2 rounded w-1/2" />
      </div>
    </div>
  )
}
