import { useState, useCallback } from 'react';
import { Bold, Italic, Heading1, Heading2, List, ListOrdered, Eye, Edit3, Save, X, Quote, Minus } from 'lucide-react';

interface DocumentEditorProps {
  initialContent: string;
  initialTitle: string;
  onSave: (title: string, content: string, summary: string) => Promise<void>;
  onCancel?: () => void;
  isNew?: boolean;
}

export function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-slate-800 mt-5 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-slate-800 mt-6 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-slate-900 mt-6 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic text-slate-700">$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-slate-100 text-amber-700 px-1.5 py-0.5 rounded text-[13px] font-mono">$1</code>')
    .replace(/^---$/gm, '<hr class="my-5 border-slate-200" />')
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-amber-400 pl-4 py-1 my-3 text-slate-600 bg-amber-50 rounded-r italic">$1</blockquote>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-5 list-decimal text-slate-700 mb-1.5 pl-1">$1</li>')
    .replace(/^[-*] (.+)$/gm, '<li class="ml-5 list-disc text-slate-700 mb-1.5 pl-1">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, (m) => `<ul class="my-3">${m}</ul>`)
    .replace(/\n\n/g, '</p><p class="mb-3 text-slate-700 leading-relaxed">')
    .replace(/\n/g, '<br/>')
    .replace(/^(?!<)(.+?)(?=<|$)/gm, (m) => m.trim() ? `<p class="mb-3 text-slate-700 leading-relaxed">${m}</p>` : '');
}

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function readTime(text: string) {
  const words = wordCount(text);
  const mins = Math.ceil(words / 200);
  return mins <= 1 ? '1 min lectura' : `${mins} min lectura`;
}

function insertAtCursor(textarea: HTMLTextAreaElement, before: string, after = ''): { value: string; start: number; end: number } {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.substring(start, end);
  const value = textarea.value.substring(0, start) + before + selected + after + textarea.value.substring(end);
  return { value, start: start + before.length, end: start + before.length + selected.length };
}

export default function DocumentEditor({ initialContent, initialTitle, onSave, onCancel, isNew = false }: DocumentEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState('');
  const [showSummary, setShowSummary] = useState(false);

  const handleFormat = useCallback((type: string) => {
    const textarea = document.getElementById('doc-editor') as HTMLTextAreaElement;
    if (!textarea) return;
    const formats: Record<string, [string, string]> = {
      bold: ['**', '**'], italic: ['*', '*'], h1: ['# ', ''], h2: ['## ', ''],
      ul: ['- ', ''], ol: ['1. ', ''], quote: ['> ', ''], hr: ['---\n', ''],
    };
    const [before, after] = formats[type] ?? ['', ''];
    const result = insertAtCursor(textarea, before, after);
    setContent(result.value);
    requestAnimationFrame(() => { textarea.focus(); textarea.setSelectionRange(result.start, result.end); });
  }, []);

  const handleSave = async () => {
    if (!title.trim()) return;
    if (isNew) {
      setSaving(true);
      await onSave(title, content, '');
      setSaving(false);
    } else {
      setShowSummary(true);
    }
  };

  const confirmSave = async () => {
    setSaving(true);
    await onSave(title, content, summary);
    setSaving(false);
    setShowSummary(false);
    setSummary('');
  };

  const words = wordCount(content);

  return (
    <div className="flex flex-col h-full">
      {/* Title */}
      <div className="px-6 pt-5 pb-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título del documento..."
          className="w-full text-2xl font-bold text-slate-900 bg-transparent border-none outline-none placeholder:text-slate-300"
        />
        {content && (
          <p className="text-xs text-slate-400 mt-1">{words} palabras · {readTime(content)}</p>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-6 py-2 border-y border-slate-100">
        {!preview && (
          <>
            <ToolbarBtn icon={<Bold size={13} />} onClick={() => handleFormat('bold')} title="Negrita (Ctrl+B)" />
            <ToolbarBtn icon={<Italic size={13} />} onClick={() => handleFormat('italic')} title="Cursiva (Ctrl+I)" />
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <ToolbarBtn icon={<Heading1 size={13} />} onClick={() => handleFormat('h1')} title="Título 1" />
            <ToolbarBtn icon={<Heading2 size={13} />} onClick={() => handleFormat('h2')} title="Título 2" />
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <ToolbarBtn icon={<List size={13} />} onClick={() => handleFormat('ul')} title="Lista con viñetas" />
            <ToolbarBtn icon={<ListOrdered size={13} />} onClick={() => handleFormat('ol')} title="Lista numerada" />
            <ToolbarBtn icon={<Quote size={13} />} onClick={() => handleFormat('quote')} title="Cita" />
            <ToolbarBtn icon={<Minus size={13} />} onClick={() => handleFormat('hr')} title="Separador" />
            <div className="w-px h-4 bg-slate-200 mx-1" />
          </>
        )}
        <button
          onClick={() => setPreview(!preview)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
            preview ? 'bg-amber-100 text-amber-700' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          {preview ? <Edit3 size={11} /> : <Eye size={11} />}
          {preview ? 'Editar' : 'Vista previa'}
        </button>
        <div className="flex-1" />
        {onCancel && (
          <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors">
            <X size={12} /> Cancelar
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={!title.trim() || saving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          <Save size={12} /> {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {/* Editor / Preview */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {preview ? (
          <div
            className="max-w-none text-sm"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) || '<p class="text-slate-400">Sin contenido aún.</p>' }}
          />
        ) : (
          <>
            <textarea
              id="doc-editor"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Escribe aquí... (Markdown soportado)\n\n# Título grande\n## Subtítulo\n**negrita** *cursiva*\n- Elemento de lista\n1. Lista numerada\n> Cita importante`}
              className="w-full h-full min-h-[420px] text-sm text-slate-700 bg-transparent border-none outline-none resize-none leading-relaxed font-mono placeholder:text-slate-300 placeholder:font-sans placeholder:text-xs"
            />
          </>
        )}
      </div>

      {/* Save summary modal */}
      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSummary(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h4 className="font-semibold text-slate-800 mb-1">Guardar nueva versión</h4>
            <p className="text-sm text-slate-500 mb-3">¿Qué cambió en esta versión? (opcional)</p>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Ej: Actualizados los horarios de apertura, nueva sección de seguridad"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 mb-4"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') confirmSave(); }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSummary(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
              <button onClick={confirmSave} disabled={saving} className="px-5 py-2 text-sm bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50 font-medium transition-colors shadow-sm">
                {saving ? 'Guardando...' : 'Guardar versión'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolbarBtn({ icon, onClick, title }: { icon: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
    >
      {icon}
    </button>
  );
}
