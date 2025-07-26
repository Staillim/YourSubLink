"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // The ThemeProvider from next-themes handles the "system" theme preference automatically.
  // The `enableSystem` prop (passed in layout.tsx) listens for the user's
  // operating system's color scheme and applies the "light" or "dark" theme accordingly.
  // No additional logic is needed here for that functionality.
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
