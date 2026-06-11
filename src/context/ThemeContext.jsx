import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('fcsm_theme')
    return saved ? saved === 'dark' : true // dark by default
  })

  useEffect(() => {
    localStorage.setItem('fcsm_theme', dark ? 'dark' : 'light')
    document.documentElement.classList.toggle('light', !dark)
  }, [dark])

  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
