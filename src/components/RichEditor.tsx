import { useRef, useEffect, useState, useCallback } from 'react';
import { Bold, Italic, Underline, Strikethrough, Highlighter, RemoveFormatting } from 'lucide-react';

// ── Word vocabulary (same as SmartTextarea) ──────────────────────────────
const DOMAIN_WORDS = [
  'production','harvest','yield','output','capacity','throughput','efficiency',
  'operational','maintenance','downtime','calibration','inspection','quality',
  'packaging','processing','storage','logistics','distribution','delivery',
  'inventory','procurement','purchase','supplier','vendor','contract',
  'irrigation','fertilizer','pesticide','herbicide','fungicide','seed','crop',
  'plantation','greenhouse','soil','humidity','temperature','moisture',
  'organic','compost','bacteria','fungus','mold','spore','contamination',
  'cold-chain','refrigeration','freezing','drying','pasteurization',
  'meeting','alignment','objective','milestone','action','deadline','priority',
  'budget','revenue','cost','profit','margin','forecast','target',
  'stakeholder','approval','compliance','audit','report','analysis','strategy',
  'investment','payment','invoice','order','shipment','export','import',
  'assigned','responsible','completed','pending','review','follow-up','escalate',
  'resolved','decision','approved','rejected','deferred','urgent','critical',
  'open','closed','in-progress','done','blocked','delayed','on-track','at-risk',
  'weekly','monthly','quarterly','annually','immediate','scheduled','planned',
];

const STORAGE_KEY = 'logbook_word_history';
function getWordHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveWords(words: string[]) {
  try {
    const merged = Array.from(new Set([...words, ...getWordHistory()])).slice(0, 500);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch { /* ignore */ }
}
function getSuggestions(partial: string, history: string[]): string[] {
  if (!partial || partial.length < 2) return [];
  const lower = partial.toLowerCase();
  return Array.from(new Set([...history, ...DOMAIN_WORDS]))
    .filter(w => w.toLowerCase().startsWith(lower) && w.toLowerCase() !== lower)
    .slice(0, 6);
}
function getCaretWord(el: HTMLElement): string {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return '';
  const range = sel.getRangeAt(0).cloneRange();
  range.collapse(true);
  const dummy = document.createElement('span');
  range.insertNode(dummy);
  const text = el.innerText;
  const idx = text.lastIndexOf(dummy.innerText, text.indexOf(dummy.innerText));
  dummy.parentNode?.removeChild(dummy);
  const before = text.slice(0, idx);
  const match = before.match(/[\w-]+$/);
  return match ? match[0] : '';
}

interface Props {
  value: string;           // stored as HTML
  onChange: (html: string) => void;
  onEscape?: () => void;   // called when Esc is pressed with no dropdown open
  placeholder?: string;
  minRows?: number;
}

const HIGHLIGHT_COLOR = '#fde047'; // yellow-300

export default function RichEditor({ value, onChange, onEscape, placeholder, minRows = 5 }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions]   = useState<string[]>([]);
  const [activeIdx, setActiveIdx]       = useState(0);
  const [showSugg, setShowSugg]         = useState(false);
  const [wordHistory]                   = useState<string[]>(getWordHistory);
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false, strikeThrough: false });

  // Initialise HTML content once
  useEffect(() => {
    const el = editorRef.current;
    if (el && el.innerHTML !== value) el.innerHTML = value || '';
  }, []); // intentionally only on mount

  // Track cursor to update toolbar active state
  const updateActiveFormats = () => {
    setActiveFormats({
      bold:         document.queryCommandState('bold'),
      italic:       document.queryCommandState('italic'),
      underline:    document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough'),
    });
  };

  const execCmd = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    updateActiveFormats();
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const applyHighlight = () => {
    editorRef.current?.focus();
    // toggle: if already highlighted, remove; otherwise apply
    document.execCommand('hiliteColor', false, HIGHLIGHT_COLOR);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    onChange(el.innerHTML);
    updateActiveFormats();

    const partial = getCaretWord(el);
    const suggs = getSuggestions(partial, wordHistory);
    setSuggestions(suggs);
    setActiveIdx(0);
    setShowSugg(suggs.length > 0);
  }, [onChange, wordHistory]);

  const applySuggestion = (word: string) => {
    const el = editorRef.current;
    if (!el) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    // move range start back by partial word length
    const container = range.startContainer;
    const offset    = range.startOffset;
    const text      = container.textContent || '';
    const before    = text.slice(0, offset);
    const match     = before.match(/[\w-]+$/);
    const partialLen = match ? match[0].length : 0;

    range.setStart(container, offset - partialLen);
    range.deleteContents();
    range.insertNode(document.createTextNode(word));
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);

    onChange(el.innerHTML);
    setShowSugg(false);
    setSuggestions([]);
    saveWords([word]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // ── Autocomplete navigation ────────────────────────────
    if (showSugg && suggestions.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Tab')       { e.preventDefault(); applySuggestion(suggestions[activeIdx]); return; }
      if (e.key === 'Escape')    { e.preventDefault(); setShowSugg(false); return; }
    }

    // ── Esc with no dropdown → abort editing ───────────────
    if (e.key === 'Escape') { e.preventDefault(); onEscape?.(); return; }

    // ── Formatting shortcuts ───────────────────────────────
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); execCmd('bold'); }
      if (e.key === 'i') { e.preventDefault(); execCmd('italic'); }
      if (e.key === 'u') { e.preventDefault(); execCmd('underline'); }
      if (e.key === 'h') { e.preventDefault(); applyHighlight(); }
    }
  };

  const handleBlur = () => {
    setTimeout(() => setShowSugg(false), 150);
    if (editorRef.current) {
      const words = editorRef.current.innerText
        .split(/\s+/).filter(w => w.length > 3)
        .map(w => w.toLowerCase().replace(/[^a-z-]/g, ''));
      saveWords(words);
    }
  };

  const partial = editorRef.current ? getCaretWord(editorRef.current) : '';

  return (
    <div className="w-full flex flex-col gap-0">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 border-b-0 rounded-t-xl">
        <ToolBtn title="Bold (Ctrl+B)"      active={activeFormats.bold}         onClick={() => execCmd('bold')}>
          <Bold size={13} />
        </ToolBtn>
        <ToolBtn title="Italic (Ctrl+I)"    active={activeFormats.italic}       onClick={() => execCmd('italic')}>
          <Italic size={13} />
        </ToolBtn>
        <ToolBtn title="Underline (Ctrl+U)" active={activeFormats.underline}    onClick={() => execCmd('underline')}>
          <Underline size={13} />
        </ToolBtn>
        <ToolBtn title="Strikethrough"      active={activeFormats.strikeThrough} onClick={() => execCmd('strikeThrough')}>
          <Strikethrough size={13} />
        </ToolBtn>

        <div className="w-px h-4 bg-slate-700 mx-1" />

        {/* Highlight */}
        <button
          type="button"
          title="Highlight (Ctrl+H)"
          onMouseDown={e => { e.preventDefault(); applyHighlight(); }}
          className="p-1.5 rounded-lg transition-colors hover:bg-yellow-400/20 text-yellow-400"
        >
          <Highlighter size={13} />
        </button>

        <div className="w-px h-4 bg-slate-700 mx-1" />

        {/* Clear formatting */}
        <ToolBtn title="Clear formatting" active={false} onClick={() => execCmd('removeFormat')}>
          <RemoveFormatting size={13} />
        </ToolBtn>

        <div className="ml-auto text-[9px] text-slate-600 font-black uppercase tracking-widest hidden md:block">
          Esc = abort
        </div>
      </div>

      {/* ── Editable content area ───────────────────────────────────────── */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          onBlur={handleBlur}
          onFocus={updateActiveFormats}
          data-placeholder={placeholder}
          style={{ minHeight: `${minRows * 1.6}rem` }}
          className="financial-input w-full text-sm leading-relaxed rounded-t-none focus:outline-none prose-dark rich-content"
        />

        {/* ── Autocomplete dropdown ──────────────────────────────────────── */}
        {showSugg && suggestions.length > 0 && (
          <div className="absolute z-50 left-0 right-0 mt-0 bg-slate-900 border border-slate-700/80 border-t-0 rounded-b-xl shadow-2xl overflow-hidden">
            <div className="px-3 py-1 border-b border-slate-800 flex items-center justify-between">
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Word suggestions — Tab to insert</span>
            </div>
            {suggestions.map((word, i) => {
              const rest = word.slice(partial.length);
              return (
                <button
                  key={word}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); applySuggestion(word); }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-0.5 ${
                    i === activeIdx ? 'bg-blue-600/30 text-blue-300 border-l-2 border-blue-500' : 'text-slate-300 hover:bg-slate-800/70'
                  }`}
                >
                  <span className="font-bold text-white">{partial}</span>
                  <span className="text-blue-400">{rest}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Small toolbar button ─────────────────────────────────────────────────
function ToolBtn({ children, active, onClick, title }: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className={`p-1.5 rounded-lg transition-all ${
        active
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-slate-400 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
