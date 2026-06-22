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
              ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 shadow-[0_0_6px_rgba(99,102,241,0.15)] animate-pulse'
              : isSortedActiveAsc || isSortedActiveDesc
              ? 'bg-teal-650/10 border-teal-500/50 text-teal-300'
              : 'bg-[#060c16] border-slate-755/65 text-slate-350 hover:border-slate-600 hover:text-white'
          }`}
        >
          <span>{label}</span>
          {isSortedActiveAsc && <ArrowUp size={9} className="stroke-[3]" />}
          {isSortedActiveDesc && <ArrowDown size={9} className="stroke-[3]" />}
          {hasActiveFilter ? (
            <Filter size={9} className="stroke-[2.5] text-indigo-400 fill-indigo-400/10" />
          ) : (
            <ChevronDown size={9} className="stroke-[2] text-slate-500" />
          )}
        </button>
      )}

      {/* Filter Dropdown Body */}
      {isOpen && (
        <div 
          className="absolute left-0 mt-1.5 w-60 rounded-xl bg-[#090f1d] border border-[#1e2e4f] shadow-[0_12px_40px_rgba(0,0,0,0.9)] z-50 text-xs text-slate-200 flex flex-col overflow-hidden max-h-[360px]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-3 py-2 bg-[#0e1728] border-b border-[#1b2d4f] flex items-center justify-between">
            <span className="font-black text-indigo-400 uppercase tracking-widest text-[9.5px]">
              Filtro de {label}
            </span>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-white cursor-pointer transition-colors"
            >
              <X size={12} />
            </button>
          </div>

          {/* Quick Sort Options */}
          <div className="grid grid-cols-2 divide-x divide-[#1a2c4f] border-b border-[#1a2c4f] bg-[#0c1322]">
            <button
              onClick={() => {
                onSortAsc();
                setIsOpen(false);
              }}
              className={`py-1.5 px-2 hover:bg-slate-800/50 transition-all font-bold flex items-center justify-center gap-1 text-[10px] uppercase cursor-pointer ${
                isSortedActiveAsc ? 'text-indigo-400 font-extrabold' : 'text-slate-300'
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
              className={`py-1.5 px-2 hover:bg-slate-800/50 transition-all font-bold flex items-center justify-center gap-1 text-[10px] uppercase cursor-pointer ${
                isSortedActiveDesc ? 'text-indigo-400 font-extrabold' : 'text-slate-300'
              }`}
            >
              <ArrowDown size={11} className="stroke-[2.5]" />
              <span>Z-A (Decresc.)</span>
            </button>
          </div>

          {/* Search values input */}
          {uniqueValues.length > 5 && (
            <div className="px-3 py-1.5 border-b border-[#182745] flex items-center gap-1.5 bg-[#070c16]/50">
              <Search size={12} className="text-slate-500 shrink-0" />
              <input
                type="text"
                placeholder={`Pesquisar ${label.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none text-slate-105 placeholder-slate-600 focus:outline-none focus:ring-0 w-full text-[11px] font-bold font-sans"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-slate-500 hover:text-white"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          )}

          {/* Multi-selection Toggle Actions */}
          <div className="px-3 py-1.5 flex items-center gap-2 border-b border-[#182745] bg-[#070c14]/30 select-none text-[10.5px]">
            <button
              onClick={handleSelectAll}
              className="text-slate-400 hover:text-white font-bold uppercase transition-colors cursor-pointer"
            >
              Marcar Todos
            </button>
            <span className="text-slate-650">•</span>
            <button
              onClick={handleClearSelection}
              className="text-slate-405 hover:text-white font-bold uppercase transition-colors cursor-pointer"
            >
              Remover Todos
            </button>
          </div>

          {/* Checklist of unique values */}
          <div className="flex-1 overflow-y-auto max-h-48 divide-y divide-slate-900/40 px-1 py-1 scrollbar-thin select-none">
            {filteredValues.length === 0 ? (
              <div className="py-4 text-center text-slate-600 font-bold uppercase text-[9.5px]">
                Nenhum valor encontrado
              </div>
            ) : (
              filteredValues.map(val => {
                const isChecked = tempSelected.includes(val);
                return (
                  <label
                    key={val}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded hover:bg-slate-800/45 cursor-pointer text-[11px] transition-colors leading-tight truncate uppercase"
                    title={val}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleValue(val)}
                      className="rounded border-slate-700 bg-[#070c14] text-indigo-550 focus:ring-0 focus:ring-offset-0 cursor-pointer h-3.5 w-3.5 accent-indigo-505"
                    />
                    <span className={isChecked ? 'text-white font-extrabold' : 'text-slate-400 font-medium'}>
                      {val || 'SEM VALOR'}
                    </span>
                  </label>
                );
              })
            )}
          </div>

          {/* Footer actions */}
          <div className="p-2 bg-[#060b16] border-t border-[#182745] flex items-center gap-2">
            <button
              onClick={handleResetFilter}
              disabled={!hasActiveFilter}
              className="px-2 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-red-400 text-[10.5px] font-black uppercase rounded disabled:opacity-35 disabled:hover:text-slate-400 select-none cursor-pointer transition-all flex-1"
            >
              Limpar
            </button>
            <button
              onClick={handleApply}
              className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white text-[10.5px] font-black uppercase rounded select-none cursor-pointer shadow-lg hover:shadow-indigo-500/10 transition-all flex-1"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
