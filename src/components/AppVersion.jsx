export default function AppVersion({ className = '' }) {
  return (
    <div className={`text-center text-muted text-[0.6rem] tracking-widest opacity-40 ${className}`}>
      v{__APP_VERSION__}
    </div>
  )
}
