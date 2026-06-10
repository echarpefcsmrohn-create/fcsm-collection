export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="sticky top-0 z-50 border-b-2 border-jaune"
      style={{ background: 'linear-gradient(150deg, #001f5c 0%, #002575 50%)' }}>
      <div className="pt-12 pb-4 px-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bebas text-3xl tracking-[3px] text-jaune leading-none">{title}</div>
            {subtitle && <div className="text-argent text-xs tracking-wide mt-0.5">{subtitle}</div>}
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
