import { createContext, useContext, useEffect, useState } from 'react'

export const FONT_SIZE_OPTIONS = [
  { key: 'sm', label: 'Small',  px: 14 },
  { key: 'md', label: 'Medium', px: 16 },
  { key: 'lg', label: 'Large',  px: 18 },
]

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [fontSize, setFontSizeState] = useState(
    () => localStorage.getItem('edutok-font-size') || 'lg',
  )

  const [theme, setThemeState] = useState(
    () => localStorage.getItem('edutok-theme') || 'light',
  )

  // Apply font size
  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize)
  }, [fontSize])

  // Apply theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  function setFontSize(key) {
    localStorage.setItem('edutok-font-size', key)
    setFontSizeState(key)
  }

  function setTheme(t) {
    localStorage.setItem('edutok-theme', t)
    setThemeState(t)
  }

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <SettingsContext.Provider value={{ fontSize, setFontSize, theme, setTheme, toggleTheme }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
