import { createContext, useContext } from 'react'

interface ThemeContextValue {
  isDark: boolean
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  toggleTheme: () => {},
})

export function useThemeContext() {
  return useContext(ThemeContext)
}
