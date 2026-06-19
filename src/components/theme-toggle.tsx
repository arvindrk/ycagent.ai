'use client';

import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { Switch } from '@/components/ui/switch';
import { Moon, Sun } from 'lucide-react';

function subscribeToMount() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribeToMount, getClientSnapshot, getServerSnapshot);

  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <Sun className="h-4 w-4 text-muted-foreground" />
        <Switch checked={false} disabled />
        <Moon className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Sun className="h-4 w-4 text-muted-foreground" />
      <Switch
        checked={resolvedTheme === 'dark'}
        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
      />
      <Moon className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}
