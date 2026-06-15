import { useState, useCallback } from 'react';

export function useCargaSelection() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const toggleSelectAll = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const allChecked = ids.length > 0 && ids.every((id) => prev.includes(id));
      if (allChecked) {
        // Uncheck all in the filtered list
        return prev.filter((id) => !ids.includes(id));
      } else {
        // Add all in the filtered list
        return Array.from(new Set([...prev, ...ids]));
      }
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  return {
    selectedIds,
    setSelectedIds,
    toggleRow,
    toggleSelectAll,
    clearSelection,
  };
}
