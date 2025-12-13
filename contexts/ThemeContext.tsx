
import React, { createContext, useContext, useState, useEffect } from 'react';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  primaryColor: string;
  toggleMode: () => void;
  setPrimaryColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper to convert Hex to RGB
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

// Helper to generate a palette from a single color
// This mixes the color with white (for lighter shades) or black (for darker shades)
const generatePalette = (hex: string) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  const { r, g, b } = rgb;

  const mix = (start: number, end: number, percent: number) => {
    return Math.round(start + (end - start) * (percent / 100));
  };

  const mixColor = (targetR: number, targetG: number, targetB: number, percent: number) => {
    return `${mix(r, targetR, percent)} ${mix(g, targetG, percent)} ${mix(b, targetB, percent)}`;
  };

  // Generate 50-950 scale
  // 50 is 95% white, 500 is base color, 900 is 80% black
  return {
    '--primary-50': mixColor(255, 255, 255, 95),
    '--primary-100': mixColor(255, 255, 255, 90),
    '--primary-200': mixColor(255, 255, 255, 75),
    '--primary-300': mixColor(255, 255, 255, 50),
    '--primary-400': mixColor(255, 255, 255, 25),
    '--primary-500': `${r} ${g} ${b}`, // Base
    '--primary-600': mixColor(0, 0, 0, 10),
    '--primary-700': mixColor(0, 0, 0, 30),
    '--primary-800': mixColor(0, 0, 0, 50),
    '--primary-900': mixColor(0, 0, 0, 70),
    '--primary-950': mixColor(0, 0, 0, 85),
  };
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('theme_mode') as ThemeMode) || 'light';
  });
  
  // Default blue-600
  const [primaryColor, setPrimaryColorState] = useState<string>(() => {
    return localStorage.getItem('theme_color') || '#2563eb';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Apply Dark Mode
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme_mode', mode);

    // Apply Colors
    const palette = generatePalette(primaryColor);
    if (palette) {
      Object.entries(palette).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
    }
    localStorage.setItem('theme_color', primaryColor);

  }, [mode, primaryColor]);

  const toggleMode = () => setMode(prev => prev === 'light' ? 'dark' : 'light');
  const setPrimaryColor = (color: string) => setPrimaryColorState(color);

  return (
    <ThemeContext.Provider value={{ mode, primaryColor, toggleMode, setPrimaryColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
