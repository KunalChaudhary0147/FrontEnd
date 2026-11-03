import type { ReactNode } from 'react';
import { Menu, Radio, WifiOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useBackendHealth, type BackendHealth } from '@/hooks/use-backend-health';
import { pageLabel, type PageId } from '@/lib/navigation';
import { cn } from '@/lib/utils';

const HEALTH_LABELS: Record<BackendHealth, { text: string; className: string; Icon: LucideIcon }> = {
  checking: { text: 'Checking backend', className: 'text-muted-foreground', Icon: Radio },
  connected: { text: 'Backend connected', className: 'text-emerald-300', Icon: Radio },
  unreachable: { text: 'Backend unreachable', className: 'text-amber-300', Icon: WifiOff },
  'not-configured': { text: 'Backend not connected', className: 'text-muted-foreground', Icon: WifiOff },
};

export function BackendStatusBadge() {
  const health = useBackendHealth();
  const { text, className, Icon } = HEALTH_LABELS[health];
  return (
    <div
      className={cn('flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium', className)}
      role="status"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="whitespace-nowrap">{text}</span>
    </div>
  );
}

interface TopBarProps {
  currentPage: PageId;
  onOpenMobileMenu: () => void;
}

export function TopBar({ currentPage, onOpenMobileMenu }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/90 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onOpenMobileMenu} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
        <h2 className="truncate text-base font-semibold sm:text-lg">{pageLabel(currentPage)}</h2>
      </div>
      <BackendStatusBadge />
    </header>
  );
}

export function MobileNavSheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 border-r bg-card p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">Choose a page</SheetDescription>
        {children}
      </SheetContent>
    </Sheet>
  );
}
