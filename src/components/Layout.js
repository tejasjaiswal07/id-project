import Advertisement from './Advertisement';

export default function Layout({ children }) {
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