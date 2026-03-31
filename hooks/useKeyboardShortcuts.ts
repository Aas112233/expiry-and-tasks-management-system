import { useEffect, useCallback, useRef } from 'react';

// Shortcut configuration type
interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  handler: (e: KeyboardEvent) => void;
  preventDefault?: boolean;
  description?: string;
}

// Hook for keyboard shortcuts
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        // Allow Escape even in inputs
        if (e.key !== 'Escape') return;
      }

      for (const shortcut of shortcutsRef.current) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrl === e.ctrlKey;
        const altMatch = !!shortcut.alt === e.altKey;
        const shiftMatch = !!shortcut.shift === e.shiftKey;
        const metaMatch = !!shortcut.meta === e.metaKey;

        if (keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch) {
          if (shortcut.preventDefault !== false) {
            e.preventDefault();
          }
          shortcut.handler(e);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}

// Common shortcuts hook for inventory management
export function useInventoryShortcuts({
  onNew,
  onSearch,
  onRefresh,
  onCloseModal,
  isModalOpen = false
}: {
  onNew?: () => void;
  onSearch?: () => void;
  onRefresh?: () => void;
  onCloseModal?: () => void;
  isModalOpen?: boolean;
}) {
  const shortcuts: ShortcutConfig[] = [
    // Ctrl/Cmd + K - Focus search
    {
      key: 'k',
      ctrl: true,
      handler: () => onSearch?.(),
      description: 'Focus search',
    },
    // N - New item (when modal closed)
    {
      key: 'n',
      handler: () => {
        if (!isModalOpen) onNew?.();
      },
      description: 'New item',
    },
    // R - Refresh (when modal closed)
    {
      key: 'r',
      handler: () => {
        if (!isModalOpen) onRefresh?.();
      },
      description: 'Refresh data',
    },
    // Escape - Close modal
    {
      key: 'Escape',
      handler: () => {
        if (isModalOpen) onCloseModal?.();
      },
      description: 'Close modal',
    },
  ];

  useKeyboardShortcuts(shortcuts);

  // Return shortcut help text
  return useCallback(() => [
    { key: 'Ctrl + K', description: 'Focus search' },
    { key: 'N', description: 'New item' },
    { key: 'R', description: 'Refresh' },
    { key: 'Esc', description: 'Close modal' },
  ], []);
}

// Global app shortcuts
export function useAppShortcuts({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  useKeyboardShortcuts([
    // Ctrl/Cmd + 1-5 - Navigate to main sections
    {
      key: '1',
      ctrl: true,
      handler: () => onNavigate('/'),
      description: 'Go to Dashboard',
    },
    {
      key: '2',
      ctrl: true,
      handler: () => onNavigate('/expired-goods'),
      description: 'Go to Inventory',
    },
    {
      key: '3',
      ctrl: true,
      handler: () => onNavigate('/tasks'),
      description: 'Go to Tasks',
    },
    {
      key: '4',
      ctrl: true,
      handler: () => onNavigate('/employees'),
      description: 'Go to Employees',
    },
    {
      key: '5',
      ctrl: true,
      handler: () => onNavigate('/reports'),
      description: 'Go to Reports',
    },
  ]);
}

// Hook for modal-specific shortcuts
export function useModalShortcuts({
  onSave,
  onClose,
  isDirty = false
}: {
  onSave?: () => void;
  onClose?: () => void;
  isDirty?: boolean;
}) {
  useKeyboardShortcuts([
    {
      key: 's',
      ctrl: true,
      handler: () => onSave?.(),
      description: 'Save (Ctrl+S)',
    },
    {
      key: 'Escape',
      handler: () => {
        // Confirm before closing if dirty
        if (isDirty && !window.confirm('You have unsaved changes. Close anyway?')) {
          return;
        }
        onClose?.();
      },
      description: 'Close modal',
    },
  ]);
}

export default useKeyboardShortcuts;
