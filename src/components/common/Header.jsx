import { AppBar, Toolbar, Button, IconButton, Box } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useTheme } from '../../contexts/ThemeContext';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Header() {
  const { darkMode, toggleDarkMode } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration errors by only rendering after client-side mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // Return a skeleton header to prevent hydration mismatch
    return (
      <AppBar position="sticky">
        <Toolbar>
          <Box sx={{ textDecoration: 'none', color: 'inherit' }}>
            <h1 style={{ margin: 0 }}>VidGrab Pro</h1>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            {/* Placeholder buttons */}
            <Button color="inherit">YouTube</Button>
            <Button color="inherit">Instagram</Button>
            <IconButton color="inherit">
              {darkMode ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
    );
  }

  return (
    <AppBar position="sticky">
      <Toolbar>
        <Link href="/" passHref legacyBehavior>
          <Box component="a" sx={{ textDecoration: 'none', color: 'inherit' }}>
            <h1 style={{ margin: 0 }}>VidGrab Pro</h1>
          </Box>
        </Link>
        <Box sx={{ flexGrow: 1 }} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Link href="/instagram" passHref legacyBehavior>
            <Button component="a" color="inherit" sx={{ fontWeight: 'bold' }}>Instagram</Button>
          </Link>
          <Link href="/performance" passHref legacyBehavior>
            <Button component="a" color="inherit">Performance</Button>
          </Link>
          <IconButton color="inherit" onClick={toggleDarkMode}>
            {darkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
