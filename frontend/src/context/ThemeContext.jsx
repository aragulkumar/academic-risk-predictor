import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  // Initialize theme from localStorage or default to system preference (or dark)
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('app-theme')
      if (saved === 'dark' || saved === 'light') return saved
    } catch {}
    return 'light' // default is always light / white
  })

  // Whenever theme changes, update document data-theme attribute
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    localStorage.setItem('app-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
