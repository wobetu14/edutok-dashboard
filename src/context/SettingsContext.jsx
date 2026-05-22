import { createContext, useContext, useEffect, useState } from 'react'

export const FONT_SIZE_OPTIONS = [
  { key: 'sm', label: 'Small',  px: 14 },
  { key: 'md', label: 'Medium', px: 16 },
  { key: 'lg', label: 'Large',  px: 18 },
]

const STORAGE_KEY = 'edutok-font-size'

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [fontSize, setFontSizeState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || 'lg',
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize)
  }, [fontSize])

  function setFontSize(key) {
    localStorage.setItem(STORAGE_KEY, key)
    setFontSizeState(key)
  }

  return (
    <SettingsContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
