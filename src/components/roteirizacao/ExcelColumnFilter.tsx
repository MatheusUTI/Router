import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Filter, ChevronDown, AlignLeft, Search, Check, X, ArrowUp, ArrowDown } from 'lucide-react';

interface ExcelColumnFilterProps {
  label: string;
  uniqueValues: string[];
  selectedValues: string[] | null;
  onApply: (values: string[] | null) => void;
  onSortAsc: () => void;
  onSortDesc: () => void;
  isSortedActiveAsc: boolean;
  isSortedActiveDesc: boolean;
  customTrigger?: React.ReactNode;
  alignRight?: boolean;
}

export default function ExcelColumnFilter({
  label,
  uniqueValues,
  selectedValues,
  onApply,
  onSortAsc,
  onSortDesc,
  isSortedActiveAsc,
  isSortedActiveDesc,
  customTrigger,
  alignRight = false,
}: ExcelColumnFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelected, setTempSelected] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync temp selection with actual selected values when opening or when props change
  useEffect(() => {
    if (isOpen) {
      if (selectedValues === null) {
        setTempSelected([...uniqueValues]);
      } else {
        setTempSelected([...selectedValues]);
      }
    }
  }, [isOpen, selectedValues, uniqueValues]);

  // Click-away listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Filter values list inside dropdown by sub-search query
  const filteredValues = useMemo(() => {
    if (!searchQuery) return uniqueValues;
    const q = searchQuery.toUpperCase();
    return uniqueValues.filter(val => val.toUpperCase().includes(q));
  }, [uniqueValues, searchQuery]);

  const toggleValue = (val: string) => {
    setTempSelected(prev => {
      if (prev.includes(val)) {
        return prev.filter(v => v !== val);
      } else {
        return [...prev, val];
      }
    });
  };

  const handleSelectAll = () => {
    setTempSelected([...uniqueValues]);
  };

  const handleClearSelection = () => {
    setTempSelected([]);
  };

  const handleApply = () => {
    if (tempSelected.length === uniqueValues.length) {
      onApply(null); // All selected means clear specific active filter
    } else {
      onApply(tempSelected);
    }
    setIsOpen(false);
  };

  const handleResetFilter = () => {
    onApply(null);
    setIsOpen(false);
  };

  const hasActiveFilter = selectedValues !== null;

  return (
    <div className="relative inline-block text-left select-none font-sans" ref={dropdownRef}>
      {/* Trigger Button */}
      {customTrigger ? (
        <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer inline-flex items-center">
          {customTrigger}
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9.5px] md:text-[10.5px] font-extrabold uppercase transition-all duration-150 cursor-pointer ${
            hasActiveFilter
              ? 'bg-indigo-600/15 border-indigo-500 text-[var(--router-primary)] shadow-[0_0_6px_rgba(99,102,241,0.15)] animate-pulse-slow'
              : isSortedActiveAsc || isSortedActiveDesc
              ? 'bg-teal-600/10 border-teal-500/50 text-teal-700 dark:text-teal-300'
              : 'bg-[var(--router-surface)] border-[var(--router-border)] text-[var(--router-text-muted)] hover:border-[var(--router-border-strong)] hover:text-[var(--router-text)]'
          }`}
        >
          <span>{label}</span>
          {isSortedActiveAsc && <ArrowUp size={9} className="stroke-[3]" />}
          {isSortedActiveDesc && <ArrowDown size={9} className="stroke-[3]" />}
          {hasActiveFilter ? (
            <Filter size={9} className="stroke-[2.5] text-indigo-500 dark:text-indigo-400 fill-indigo-400/10" />
          ) : (
            <ChevronDown size={9} className="stroke-[2] text-[var(--router-text-muted)] dark:text-[var(--router-text-muted)]" />
          )}
        </button>
      )}

      {/* Filter Dropdown Body */}
      {isOpen && (
        <div 
          className={`absolute mt-1.5 w-64 mesa-popover ${alignRight ? 'right-0' : 'left-0'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="mesa-popover-header">
            <span className="mesa-popover-header-title">
              Filtro de {label}
            </span>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-[var(--router-text-muted)] hover:text-[var(--router-text)] dark:text-[var(--router-text-muted)] dark:hover:text-white cursor-pointer transition-colors"
            >
              <X size={12} />
            </button>
          </div>

          {/* Quick Sort Options */}
          <div className="grid grid-cols-2 divide-x divide-[var(--router-border)] border-b border-[var(--router-border)] bg-[var(--router-surface)]">
            <button
              onClick={() => {
                onSortAsc();
                setIsOpen(false);
              }}
              className={`py-1.5 px-2 hover:bg-[var(--router-surface)] dark:hover:bg-[var(--router-surface-2)] transition-all font-bold flex items-center justify-center gap-1 text-[10px] uppercase cursor-pointer ${
                isSortedActiveAsc ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-[var(--router-text-soft)] dark:text-[var(--router-text-soft)]'
              }`}
            >
              <ArrowUp size={11} className="stroke-[2.5]" />
              <span>A-Z (Cresc.)</span>
            </button>
            <button
              onClick={() => {
                onSortDesc();
                setIsOpen(false);
              }}
              className={`py-1.5 px-2 hover:bg-[var(--router-surface)] dark:hover:bg-[var(--router-surface-2)] transition-all font-bold flex items-center justify-center gap-1 text-[10px] uppercase cursor-pointer ${
                isSortedActiveDesc ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-[var(--router-text-soft)] dark:text-[var(--router-text-soft)]'
              }`}
            >
              <ArrowDown size={11} className="stroke-[2.5]" />
              <span>Z-A (Decresc.)</span>
            </button>
          </div>

          {/* Search values input */}
          {uniqueValues.length > 5 && (
            <div className="mesa-popover-search">
              <Search size={12} className="text-[var(--router-text-muted)] dark:text-[var(--router-text-muted)] shrink-0" />
              <input
                type="text"
                placeholder={`Pesquisar ${label.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mesa-popover-input"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-[var(--router-text-muted)] hover:text-[var(--router-text)] dark:text-[var(--router-text-muted)] dark:hover:text-white"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          )}

          {/* Multi-selection Toggle Actions */}
          <div className="px-3 py-1.5 flex items-center gap-2 border-b border-[var(--router-border)] bg-[var(--router-surface-2)] select-none text-[10.5px]">
            <button
              onClick={handleSelectAll}
              className="text-[var(--router-text-muted)] hover:text-[var(--router-text)] dark:text-[var(--router-text-muted)] dark:hover:text-white font-bold uppercase transition-colors cursor-pointer"
            >
              Marcar Todos
            </button>
            <span className="text-[var(--router-text-soft)] dark:text-[var(--router-text-soft)]">•</span>
            <button
              onClick={handleClearSelection}
              className="text-[var(--router-text-muted)] hover:text-[var(--router-text)] dark:text-[var(--router-text-muted)] dark:hover:text-white font-bold uppercase transition-colors cursor-pointer"
            >
              Remover Todos
            </button>
          </div>

          {/* Checklist of unique values */}
          <div className="flex-1 overflow-y-auto max-h-48 divide-y divide-slate-100 dark:divide-slate-800 px-1 py-1 scrollbar-thin select-none">
            {filteredValues.length === 0 ? (
              <div className="py-4 text-center text-[var(--router-text-muted)] dark:text-[var(--router-text-muted)] font-bold uppercase text-[9.5px]">
                Nenhum valor encontrado
              </div>
            ) : (
              filteredValues.map(val => {
                const isChecked = tempSelected.includes(val);
                return (
                  <label
                    key={val}
                    className="mesa-popover-option"
                    title={val}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleValue(val)}
                      className="rounded border-[var(--router-border)] bg-[var(--router-surface)] text-[var(--router-primary)] focus:ring-0 focus:ring-offset-0 cursor-pointer h-3.5 w-3.5 accent-[var(--router-primary)]"
                    />
                    <span className={isChecked ? 'text-[var(--router-text)] font-extrabold' : 'text-[var(--router-text-muted)] font-medium'}>
                      {val || 'SEM VALOR'}
                    </span>
                  </label>
                );
              })
            )}
          </div>

          {/* Footer actions */}
          <div className="mesa-popover-footer">
            <button
              onClick={handleResetFilter}
              disabled={!hasActiveFilter}
              className="mesa-btn-clear"
            >
              Limpar
            </button>
            <button
              onClick={handleApply}
              className="mesa-btn-apply"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
