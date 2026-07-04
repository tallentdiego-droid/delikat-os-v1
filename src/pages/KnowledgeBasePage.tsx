import { useEffect, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { searchKnowledge, type KnowledgeRecord, type ManualCode } from '../lib/knowledge';

const manualOptions: Array<ManualCode | 'all'> = ['all', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9'];

function preview(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 240 ? `${normalized.slice(0, 240)}...` : normalized;
}

export function KnowledgeBasePage(): JSX.Element {
  const [query, setQuery] = useState('');
  const [manualCode, setManualCode] = useState<ManualCode | 'all'>('all');
  const [results, setResults] = useState<KnowledgeRecord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const timer = window.setTimeout(() => {
      searchKnowledge({ query, manualCode, limit: 60 })
        .then((records) => {
          if (isMounted) setResults(records);
        })
        .catch((reason: unknown) => {
          if (isMounted) {
            setError(reason instanceof Error ? reason.message : 'Unable to search knowledge.');
            setResults([]);
          }
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }, 200);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [query, manualCode]);

  return (
    <section className="pageStack">
      <div className="sectionHeader">
        <div>
          <h2>Knowledge Base</h2>
          <p>Search approved canonical knowledge with source evidence from Supabase.</p>
        </div>
      </div>

      <div className="toolbar" role="search">
        <label className="searchField">
          <Search aria-hidden="true" size={17} />
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, body, summary, or heading"
            value={query}
          />
        </label>
        <label className="selectField">
          <span>Manual</span>
          <select
            onChange={(event) => setManualCode(event.target.value as ManualCode | 'all')}
            value={manualCode}
          >
            {manualOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'all' ? 'All' : option}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div className="notice error">
          <AlertCircle aria-hidden="true" size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="resultsMeta">{isLoading ? 'Searching...' : `${results.length} result${results.length === 1 ? '' : 's'}`}</div>

      {!isLoading && !error && results.length === 0 && (
        <div className="emptyState">
          <h3>No knowledge found</h3>
          <p>No approved Delikat knowledge matched the current search. A future Create SOP flow can start from here.</p>
        </div>
      )}

      <div className="resultList">
        {results.map((record) => {
          const isExpanded = expandedId === record.evidenceLinkId;
          return (
            <article className="resultCard" key={record.evidenceLinkId}>
              <div className="resultHeader">
                <div>
                  <h3>{record.title}</h3>
                  <div className="sourceLine">
                    <span>{record.manualCode ?? 'Manual'}</span>
                    <span>{record.sourceManualTitle}</span>
                  </div>
                </div>
                <button
                  className="iconTextButton"
                  onClick={() => setExpandedId(isExpanded ? null : record.evidenceLinkId)}
                  type="button"
                >
                  {isExpanded ? <ChevronUp aria-hidden="true" size={16} /> : <ChevronDown aria-hidden="true" size={16} />}
                  <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
                </button>
              </div>
              <p className="previewText">{preview(record.approvedBody)}</p>
              <div className="evidenceSummary">
                <strong>Source heading</strong>
                <span>{record.sourceSectionHeading}</span>
              </div>
              {isExpanded && (
                <div className="expandedEvidence">
                  <div>
                    <strong>Approved knowledge</strong>
                    <pre>{record.approvedBody}</pre>
                  </div>
                  <div>
                    <strong>Evidence</strong>
                    <p>{record.sourceFileUri}</p>
                    <p className="hashLine">{record.sourceSectionHash}</p>
                    <pre>{record.sourceSectionBody}</pre>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
