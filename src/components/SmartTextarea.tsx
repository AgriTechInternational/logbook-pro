import { useState, useRef, useEffect, useCallback } from 'react';

// ── AgriTech domain vocabulary ──────────────────────────────────────────────
const DOMAIN_WORDS = [
  // Operations
  'production','harvest','yield','output','capacity','throughput','efficiency',
  'operational','maintenance','downtime','calibration','inspection','quality',
  'packaging','processing','storage','logistics','distribution','delivery',
  'inventory','procurement','purchase','supplier','vendor','contract',
  // Farming
  'irrigation','fertilizer','pesticide','herbicide','fungicide','seed','crop',
  'plantation','greenhouse','soil','humidity','temperature','moisture','pH',
  'organic','compost','bacteria','fungus','mold','spore','contamination',
  'cold-chain','refrigeration','freezing','drying','pasteurization',
  // Business
  'meeting','alignment','objective','milestone','action','deadline','priority',
  'budget','revenue','cost','profit','margin','forecast','target','KPI',
  'stakeholder','approval','compliance','audit','report','analysis','strategy',
  'investment','payment','invoice','order','shipment','export','import',
  // Team
  'assigned','responsible','completed','pending','review','follow-up','escalate',
  'resolved','decision','approved','rejected','deferred','urgent','critical',
  // Status
  'open','closed','in-progress','done','blocked','delayed','on-track','at-risk',
  // Time
  'weekly','monthly','quarterly','annually','immediate','scheduled','planned',
];

const STORAGE_KEY = 'logbook_word_history';

function getWordHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveWordHistory(words: string[]) {
  try {
    const existing = getWordHistory();
    const merged = Array.from(new Set([...words, ...existing])).slice(0, 500);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch { /* ignore */ }
}

function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,.\-:;!?()\[\]]+/)
    .filter(w => w.length > 3)
    .map(w => w.replace(/[^a-z-]/g, ''))
    .filter(Boolean);
}

function getSuggestions(partial: string, history: string[]): string[] {
  if (!partial || partial.length < 2) return [];
  const lower = partial.toLowerCase();
  const all = Array.from(new Set([...history, ...DOMAIN_WORDS]));
  return all
    .filter(w => w.toLowerCase().startsWith(lower) && w.toLowerCase() !== lower)
    .slice(0, 6);
}

// ── Get the last partial word being typed ──────────────────────────────────
function getLastWord(text: string, cursor: number): string {
  const before = text.slice(0, cursor);
  const match = before.match(/[\w-]+$/);
  return match ? match[0] : '';
}

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  autoFocus?: boolean;
  required?: boolean;
  id?: string;
}

export default function SmartTextarea({
  value, onChange, placeholder, rows = 4, className = '', autoFocus, required, id,
}: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [wordHistory, setWordHistory] = useState<string[]>(getWordHistory);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursor = e.target.selectionStart ?? text.length;
    setCursorPos(cursor);
    onChange(text);

    const partial = getLastWord(text, cursor);
    const suggs = getSuggestions(partial, wordHistory);
    setSuggestions(suggs);
    setActiveSuggestion(0);
    setShowSuggestions(suggs.length > 0);
  }, [onChange, wordHistory]);

  const applySuggestion = useCallback((word: string) => {
    const ta = textareaRef.current;
    if (!ta) return;

    const cursor = ta.selectionStart ?? cursorPos;
    const before = value.slice(0, cursor);
    const after = value.slice(cursor);
    const partial = getLastWord(before, before.length);

    const newBefore = before.slice(0, before.length - partial.length) + word;
    const newValue = newBefore + after;
    onChange(newValue);
    setSuggestions([]);
    setShowSuggestions(false);

    // Move cursor after the inserted word
    const newCursor = newBefore.length;
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(newCursor, newCursor);
    }, 0);

    // Save word to history
    const newHistory = Array.from(new Set([word, ...wordHistory])).slice(0, 500);
    setWordHistory(newHistory);
    saveWordHistory([word]);
  }, [value, onChange, cursorPos, wordHistory]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestion(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestion(i => Math.max(i - 1, 0));
    } else if (e.key === 'Tab' || e.key === 'Enter') {
      if (showSuggestions && suggestions[activeSuggestion]) {
        e.preventDefault();
        applySuggestion(suggestions[activeSuggestion]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleBlur = () => {
    // Save all typed words on blur
    const words = extractWords(value);
    if (words.length) saveWordHistory(words);
    // Delay hiding so click on suggestion still fires
    setTimeout(() => setShowSuggestions(false), 150);
  };

  const partialWord = getLastWord(value, cursorPos);

  return (
    <div ref={containerRef} className="relative w-full">
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={() => {
          const partial = getLastWord(value, textareaRef.current?.selectionStart ?? value.length);
          const suggs = getSuggestions(partial, wordHistory);
          if (suggs.length) { setSuggestions(suggs); setShowSuggestions(true); }
        }}
        placeholder={placeholder}
        rows={rows}
        autoFocus={autoFocus}
        required={required}
        spellCheck
        autoCorrect="on"
        className={`${className} financial-input w-full resize-none leading-relaxed`}
      />

      {/* ── Suggestions dropdown ────────────────────────────────────────── */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-1">
          <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
              Word suggestions
            </span>
            <span className="text-[9px] text-slate-700">Tab / ↑↓ to navigate</span>
          </div>
          {suggestions.map((word, i) => {
            const rest = word.slice(partialWord.length);
            return (
              <button
                key={word}
                type="button"
                onMouseDown={e => { e.preventDefault(); applySuggestion(word); }}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-1 transition-colors ${
                  i === activeSuggestion
                    ? 'bg-blue-600/30 text-blue-300 border-l-2 border-blue-500'
                    : 'text-slate-300 hover:bg-slate-800/70'
                }`}
              >
                <span className="font-bold text-white">{partialWord}</span>
                <span className="text-blue-400">{rest}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
