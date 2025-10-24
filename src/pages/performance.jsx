import React from 'react';
import { Helmet } from 'react-helmet-async';
import PerformanceDashboard from '../components/performance/PerformanceDashboard';
import Layout from '../components/common/Layout';

export default function PerformancePage() {
  return (
    <>
      <Helmet>
        <title>Performance Dashboard - VigGrab Pro</title>
        <meta name="description" content="Monitor VigGrab Pro performance metrics, download speeds, and system health in real-time." />
        <meta property="og:title" content="Performance Dashboard - VigGrab Pro" />
        <meta property="og:description" content="Real-time performance monitoring for VigGrab Pro" />
      </Helmet>

      <Layout>
        <PerformanceDashboard />
      </Layout>
    </>
  );
}
