import { createContext, useContext, useState, useEffect } from 'react';
import { createTheme } from '@mui/material/styles';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check for saved preference or system preference
    const savedMode = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Use saved preference if available, otherwise use system preference
    const isDark = savedMode !== null ? savedMode === 'true' : prefersDark;
    
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  // Material Design 3 inspired theme
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#1976d2', // MD3 primary blue
        light: '#42a5f5',
        dark: '#1565c0',
      },
      secondary: {
        main: '#9c27b0', // MD3 secondary purple
        light: '#ba68c8',
        dark: '#7b1fa2',
      },
      error: {
        main: '#d32f2f',
      },
      background: {
        default: darkMode ? '#121212' : '#ffffff',
        paper: darkMode ? '#1e1e1e' : '#f5f5f5',
      },
      text: {
        primary: darkMode ? '#f5f5f5' : '#333333',
        secondary: darkMode ? '#b0b0b0' : '#666666',
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontSize: '2.5rem',
        fontWeight: 500,
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 500,
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 500,
      },
      button: {
        textTransform: 'none',
        fontWeight: 500,
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 20,
            padding: '8px 16px',
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: darkMode 
              ? '0px 4px 8px rgba(0, 0, 0, 0.4)' 
              : '0px 4px 8px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
  });

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('darkMode', !darkMode);
    document.documentElement.classList.toggle('dark', !darkMode);
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
