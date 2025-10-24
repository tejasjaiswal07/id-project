/**
 * DEPRECATED: Legacy Layout Component
 *
 * This component is deprecated in favor of the updated version.
 * Use: src/components/common/Layout.jsx instead
 *
 * The new version includes:
 * - Better Material-UI integration
 * - Improved responsive design
 * - Modern component structure
 */

import Advertisement from './Advertisement';

export default function Layout({ children }) {
  // THIS COMPONENT IS DEPRECATED
  // Please use src/components/common/Layout.jsx instead
  console.warn('[DEPRECATED] Using legacy Layout.js component. Please migrate to src/components/common/Layout.jsx');

  return (
    <div className="layout">
      {/* Top banner ad */}
      <Advertisement slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_MAIN} format="horizontal" />

      <main>{children}</main>

      {/* Sidebar ad */}
      <aside>
        <Advertisement slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR} format="vertical" />
      </aside>
      
      <style jsx>{`
        .layout {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 20px;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
      `}</style>
    </div>
  );
} 