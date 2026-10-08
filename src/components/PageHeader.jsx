import { motion } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'

export default function PageHeader({ title, subtitle, children }) {
  const { dark, toggle } = useTheme()

  return (
    <div className="sticky top-0 z-50 bg-noir border-b-[3px] border-jaune">
      <div className="bande-retro" />
      <div className="pt-8 pb-4 px-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="titre-retro text-4xl text-white leading-none truncate">{title}</div>
            {subtitle && <div className="label-retro text-jaune text-[0.62rem] mt-1.5">{subtitle}</div>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {children}
            <motion.button
              onClick={toggle}
              whileTap={{ scale: 0.9 }}
              aria-label="Changer de thème"
              className="w-10 h-10 border-[3px] border-creme bg-transparent flex items-center justify-center cursor-pointer text-base">
              {dark ? '☀️' : '🌙'}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}
