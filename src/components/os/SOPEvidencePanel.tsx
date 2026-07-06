import { OSCard } from './OSCard';

export interface SOPEvidenceItem {
  id: string;
  sourceManualTitle: string;
  sourceFileUri: string;
  sourceSectionHeading: string;
  sourceSectionBody: string;
  sourceSectionHash: string;
}

export function SOPEvidencePanel({
  title,
  evidence,
  emptyLabel,
}: {
  title: string;
  evidence: SOPEvidenceItem[];
  emptyLabel: string;
}): JSX.Element {
  return (
    <section className="detailSection">
      <h4>{title}</h4>
      {evidence.length === 0 ? (
        <div className="emptyInline">{emptyLabel}</div>
      ) : (
        <div className="sopEvidenceList">
          {evidence.map((item) => (
            <OSCard className="sopEvidenceCard" key={item.id}>
              <div className="sopEvidenceHeader">
                <div>
                  <strong>{item.sourceManualTitle}</strong>
                  <p>{item.sourceSectionHeading}</p>
                </div>
                <span className="quietText">{item.sourceFileUri}</span>
              </div>
              <div className="sopEvidenceMeta">
                <span>Hash</span>
                <strong className="hashLine">{item.sourceSectionHash}</strong>
              </div>
              <pre>{item.sourceSectionBody}</pre>
            </OSCard>
          ))}
        </div>
      )}
    </section>
  );
}
