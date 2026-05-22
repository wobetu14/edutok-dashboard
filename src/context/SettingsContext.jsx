import { createContext, useContext, useEffect, useState } from 'react'

export const FONT_SIZE_OPTIONS = [
  { key: 'sm', label: 'Small',  px: 14 },
  { key: 'md', label: 'Medium', px: 16 },
  { key: 'lg', label: 'Large',  px: 18 },
]

export const PALETTE_OPTIONS = [
  { key: 'tiktok', name: 'TikTok',  primary: '#FE2C55', secondary: '#25F4EE' },
  { key: 'ocean',  name: 'Ocean',   primary: '#3B82F6', secondary: '#06B6D4' },
  { key: 'forest', name: 'Forest',  primary: '#22C55E', secondary: '#84CC16' },
  { key: 'sunset', name: 'Sunset',  primary: '#F97316', secondary: '#EC4899' },
  { key: 'royal',  name: 'Royal',   primary: '#8B5CF6', secondary: '#6366F1' },
  { key: 'slate',  name: 'Slate',   primary: '#64748B', secondary: '#94A3B8' },
]

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [fontSize, setFontSizeState] = useState(
    () => localStorage.getItem('edutok-font-size') || 'lg',
  )

  const [theme, setThemeState] = useState(
    () => localStorage.getItem('edutok-theme') || 'light',
  )

  const [palette, setPaletteState] = useState(
    () => localStorage.getItem('edutok-palette') || 'tiktok',
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

  // Apply palette
  useEffect(() => {
    document.documentElement.setAttribute('data-palette', palette)
  }, [palette])

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

  function setPalette(key) {
    localStorage.setItem('edutok-palette', key)
    setPaletteState(key)
  }

  return (
    <SettingsContext.Provider value={{ fontSize, setFontSize, theme, setTheme, toggleTheme, palette, setPalette }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
