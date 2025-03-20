import { useState, useEffect } from 'react';
import { Box, Typography, List, ListItem, ListItemText, IconButton, Divider, Card, CardContent, Button } from '@mui/material';
import { Delete, YouTube, Instagram } from '@mui/icons-material';

export default function DownloadHistory() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    // Load history from localStorage on component mount
    try {
      const savedHistory = localStorage.getItem('downloadHistory');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error('Error loading download history:', error);
    }
  }, []);

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('downloadHistory');
  };

  const removeItem = (index) => {
    const newHistory = [...history];
    newHistory.splice(index, 1);
    setHistory(newHistory);
    localStorage.setItem('downloadHistory', JSON.stringify(newHistory));
  };

  if (history.length === 0) {
    return (
      <Card elevation={2} sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Recent Downloads</Typography>
          <Typography color="text.secondary">Your download history will appear here</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={2} sx={{ mb: 4 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Recent Downloads</Typography>
          <Button size="small" onClick={clearHistory} color="error">
            Clear All
          </Button>
        </Box>
        <List>
          {history.map((item, index) => (
            <Box key={index}>
              <ListItem
                secondaryAction={
                  <IconButton edge="end" aria-label="delete" onClick={() => removeItem(index)}>
                    <Delete />
                  </IconButton>
                }
              >
                <IconButton sx={{ mr: 1 }}>
                  {item.platform === 'youtube' ? 
                    <YouTube color="error" /> : 
                    <Instagram color="secondary" />}
                </IconButton>
                <ListItemText 
                  primary={item.title} 
                  secondary={`${item.format || item.type} • ${new Date(item.timestamp).toLocaleString()}`}
                />
              </ListItem>
              {index < history.length - 1 && <Divider />}
            </Box>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}
