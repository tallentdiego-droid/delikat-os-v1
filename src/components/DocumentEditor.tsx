import { useCallback, useState } from 'react';
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
    .replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^---$/gm, '<hr />')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^\d+\. (.+)$/gm, '<li class="md-li-ol">$1</li>')
    .replace(/^[-*] (.+)$/gm, '<li class="md-li-ul">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<)(.+)$/gm, '<p>$1</p>');
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
      bold: ['**', '**'],
      italic: ['*', '*'],
      h1: ['# ', ''],
      h2: ['## ', ''],
      ul: ['- ', ''],
      ol: ['1. ', ''],
      quote: ['> ', ''],
      hr: ['---\\n', ''],
    };
    const [before, after] = formats[type] ?? ['', ''];
    const result = insertAtCursor(textarea, before, after);
    setContent(result.value);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.start, result.end);
    });
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

  return (
    <div className="documentEditor">
      <div className="documentEditorTitleWrap">
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Document title..."
          className="documentEditorTitle"
        />
      </div>

      <div className="documentEditorToolbar">
        {!preview && (
          <>
            <ToolbarBtn icon={<Bold size={14} />} onClick={() => handleFormat('bold')} title="Bold" />
            <ToolbarBtn icon={<Italic size={14} />} onClick={() => handleFormat('italic')} title="Italic" />
            <div className="toolbarSeparator" />
            <ToolbarBtn icon={<Heading1 size={14} />} onClick={() => handleFormat('h1')} title="Heading 1" />
            <ToolbarBtn icon={<Heading2 size={14} />} onClick={() => handleFormat('h2')} title="Heading 2" />
            <div className="toolbarSeparator" />
            <ToolbarBtn icon={<List size={14} />} onClick={() => handleFormat('ul')} title="Bullet list" />
            <ToolbarBtn icon={<ListOrdered size={14} />} onClick={() => handleFormat('ol')} title="Numbered list" />
            <div className="toolbarSeparator" />
            <ToolbarBtn icon={<Quote size={14} />} onClick={() => handleFormat('quote')} title="Quote" />
            <ToolbarBtn icon={<Minus size={14} />} onClick={() => handleFormat('hr')} title="Divider" />
          </>
        )}
        <button
          onClick={() => setPreview(!preview)}
          className={`toolbarToggle ${preview ? 'active' : ''}`}
          type="button"
        >
          {preview ? <Edit3 size={12} /> : <Eye size={12} />}
          {preview ? 'Edit' : 'Preview'}
        </button>
        <div className="toolbarSpacer" />
        {onCancel && (
          <button onClick={onCancel} className="toolbarCancel" type="button">
            <X size={12} /> Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={!title.trim() || saving}
          className="toolbarSave"
          type="button"
        >
          <Save size={12} /> {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="documentEditorBody">
        {preview ? (
          <div className="documentPreview" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
        ) : (
          <textarea
            id="doc-editor"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Start writing... (supports Markdown: # H1, **bold**, *italic*, - list)"
            className="documentEditorTextarea"
          />
        )}
      </div>

      {showSummary && (
        <div className="documentEditorSummaryModal">
          <div className="documentEditorSummaryBackdrop" onClick={() => setShowSummary(false)} />
          <div className="documentEditorSummaryCard">
            <h4>Save Changes</h4>
            <p>Briefly describe what changed (optional)</p>
            <input
              type="text"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Updated opening hours, added a safety step..."
              className="documentEditorSummaryInput"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') confirmSave();
              }}
            />
            <div className="documentEditorSummaryActions">
              <button onClick={() => setShowSummary(false)} className="iconTextButton" type="button">Cancel</button>
              <button onClick={confirmSave} disabled={saving} className="iconTextButton primary" type="button">
                {saving ? 'Saving...' : 'Save Version'}
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
    <button onClick={onClick} title={title} className="toolbarButton" type="button">
      {icon}
    </button>
  );
}
