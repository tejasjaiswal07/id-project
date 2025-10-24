import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const PerformanceDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/health/performance');
      const data = await response.json();
      
      if (data.status === 'success') {
        setMetrics(data);
        setLastUpdate(new Date());
        setError(null);
      } else {
        throw new Error(data.message || 'Failed to fetch metrics');
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircleIcon color="success" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'error': return <ErrorIcon color="error" />;
      default: return <ErrorIcon />;
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (loading && !metrics) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading performance metrics...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <Button color="inherit" size="small" onClick={fetchMetrics}>
          Retry
        </Button>
      }>
        Error loading performance metrics: {error}
      </Alert>
    );
  }

  if (!metrics) {
    return (
      <Alert severity="warning">
        No performance metrics available
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          VigGrab Performance Dashboard
        </Typography>
        <Box display="flex" alignItems="center">
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchMetrics}
            disabled={loading}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          {lastUpdate && (
            <Typography variant="caption" color="text.secondary">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Health Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            {getStatusIcon(metrics.health.status)}
            <Typography variant="h6" sx={{ ml: 1 }}>
              System Health: {metrics.health.status.toUpperCase()}
            </Typography>
            <Chip
              label={`Score: ${metrics.health.performanceScore}/100`}
              color={metrics.health.performanceScore > 80 ? 'success' : 
                     metrics.health.performanceScore > 60 ? 'warning' : 'error'}
              sx={{ ml: 2 }}
            />
          </Box>
          
          {metrics.health.issues.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Issues Detected:</Typography>
              <ul>
                {metrics.health.issues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </Alert>
          )}

          {metrics.recommendations.length > 0 && (
            <Alert severity="info">
              <Typography variant="subtitle2" gutterBottom>Recommendations:</Typography>
              <ul>
                {metrics.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Grid container spacing={3}>
        {/* Download Performance */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <SpeedIcon color="primary" />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Download Performance
                </Typography>
              </Box>
              
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Average Download Time
                </Typography>
                <Typography variant="h4" color="primary">
                  {formatTime(metrics.metrics.averageDownloadTime)}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, (30000 - metrics.metrics.averageDownloadTime) / 300)}
                  color={metrics.metrics.averageDownloadTime < 10000 ? 'success' : 
                         metrics.metrics.averageDownloadTime < 30000 ? 'warning' : 'error'}
                  sx={{ mt: 1 }}
                />
              </Box>

              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Downloads Completed
                </Typography>
                <Typography variant="h5">
                  {metrics.metrics.downloadsCompleted}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Error Rate
                </Typography>
                <Typography variant="h5" color={metrics.metrics.errorRate < 0.05 ? 'success.main' : 
                                               metrics.metrics.errorRate < 0.1 ? 'warning.main' : 'error.main'}>
                  {(metrics.metrics.errorRate * 100).toFixed(2)}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Memory Usage */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <MemoryIcon color="primary" />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Memory Usage
                </Typography>
              </Box>
              
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Heap Used
                </Typography>
                <Typography variant="h4" color="primary">
                  {metrics.metrics.memoryUsage.heapUsed}MB
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(metrics.metrics.memoryUsage.heapUsed / metrics.metrics.memoryUsage.heapTotal) * 100}
                  color={metrics.metrics.memoryUsage.heapUsed < 200 ? 'success' : 
                         metrics.metrics.memoryUsage.heapUsed < 500 ? 'warning' : 'error'}
                  sx={{ mt: 1 }}
                />
              </Box>

              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Total Heap
                </Typography>
                <Typography variant="h5">
                  {metrics.metrics.memoryUsage.heapTotal}MB
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  RSS Memory
                </Typography>
                <Typography variant="h5">
                  {metrics.metrics.memoryUsage.rss}MB
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* System Information */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Information
              </Typography>
              
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Property</TableCell>
                      <TableCell>Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Node Version</TableCell>
                      <TableCell>{metrics.metrics.nodeVersion}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Platform</TableCell>
                      <TableCell>{metrics.metrics.platform}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Architecture</TableCell>
                      <TableCell>{metrics.metrics.arch}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Uptime</TableCell>
                      <TableCell>{Math.floor(metrics.metrics.uptime / 3600)}h {Math.floor((metrics.metrics.uptime % 3600) / 60)}m</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Response Time</TableCell>
                      <TableCell>{formatTime(metrics.metrics.responseTime)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Temp Directory Size</TableCell>
                      <TableCell>{metrics.metrics.tempDirectorySize}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Optimization Features */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Optimization Features
              </Typography>
              
              <Grid container spacing={2}>
                {metrics.optimization.features.map((feature, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Chip
                      label={feature}
                      color="success"
                      variant="outlined"
                      icon={<CheckCircleIcon />}
                    />
                  </Grid>
                ))}
              </Grid>
              
              <Box mt={2}>
                <Typography variant="body2" color="text.secondary">
                  Version: {metrics.optimization.version}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PerformanceDashboard;
