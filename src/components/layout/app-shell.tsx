import { useState, type ReactNode } from 'react';
import { MobileNavSheet, TopBar } from '@/components/layout/top-bar';
import { Sidebar } from '@/components/layout/sidebar';
import { useCurrentPage, type PageId } from '@/lib/navigation';

export function AppShell({ children }: { children: (page: PageId) => ReactNode }) {
  const currentPage = useCurrentPage();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r bg-card transition-[width] duration-300 ease-in-out md:block ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <Sidebar
          currentPage={currentPage}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
        />
      </aside>

      <MobileNavSheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <Sidebar currentPage={currentPage} collapsed={false} onNavigate={() => setMobileOpen(false)} />
      </MobileNavSheet>

      <div
        className={`flex min-h-screen flex-col transition-[padding] duration-300 ease-in-out ${
          collapsed ? 'md:pl-16' : 'md:pl-64'
        }`}
      >
        <TopBar currentPage={currentPage} onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children(currentPage)}</div>
        </main>
      </div>
    </div>
  );
}
