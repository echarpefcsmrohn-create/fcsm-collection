import { motion } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'

export default function PageHeader({ title, subtitle, children }) {
  const { dark, toggle } = useTheme()

  return (
    <div className="sticky top-0 z-50 border-b-2 border-jaune"
      style={{ background: 'linear-gradient(150deg, #001f5c 0%, #002575 50%)' }}>
      <div className="pt-12 pb-4 px-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-bebas text-3xl tracking-[3px] text-jaune leading-none truncate">{title}</div>
            {subtitle && <div className="text-argent text-xs tracking-wide mt-0.5">{subtitle}</div>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {children}
            <motion.button
              onClick={toggle}
              whileTap={{ scale: 0.9 }}
              className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center cursor-pointer text-base">
              {dark ? '☀️' : '🌙'}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}
