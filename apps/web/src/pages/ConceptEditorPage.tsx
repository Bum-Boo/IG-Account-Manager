import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader.js";
import { EmptyState, ErrorState } from "../components/StateBlock.js";
import type { Concept, WorkspaceData } from "../types.js";
import { accountLabel, getAccount, metadataBoolean, metadataText } from "../utils.js";

interface ConceptDraft {
  name: string;
  description: string;
  audience: string;
  pillars: string;
  voice: string;
  visualGuidelines: string;
  captionGuidelines: string;
  hashtagPolicy: string;
  scheduleCadence: string;
  preferredWindow: string;
  autoSchedule: boolean;
  autoPublish: boolean;
}

export function ConceptEditorPage({
  data,
  conceptId,
  onSave
}: {
  data: WorkspaceData;
  conceptId: string;
  onSave(id: string, patch: Partial<Concept>): Promise<void>;
}) {
  const concept = data.concepts.find((item) => item.id === conceptId);
  const [draft, setDraft] = useState<ConceptDraft | undefined>();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();

  useEffect(() => {
    if (!concept) return;
    const workflowPolicy = getRecord(concept.metadata.workflowPolicy);
    const schedulePolicy = getRecord(concept.metadata.schedulePolicy);
    setDraft({
      name: concept.name,
      description: concept.description,
      audience: concept.audience,
      pillars: concept.pillars.join(", "),
      voice: concept.voice,
      visualGuidelines: concept.visualGuidelines ?? "",
      captionGuidelines: concept.captionGuidelines ?? "",
      hashtagPolicy: metadataText(concept.metadata.hashtagPolicy),
      scheduleCadence: metadataText(schedulePolicy.cadence),
      preferredWindow: metadataText(schedulePolicy.preferredWindow),
      autoSchedule: metadataBoolean(workflowPolicy.autoSchedule),
      autoPublish: metadataBoolean(workflowPolicy.autoPublish)
    });
  }, [concept]);

  if (!concept || !draft) {
    return (
      <main className="content-area">
        <EmptyState title="Concept not found" />
      </main>
    );
  }

  const currentConcept = concept;
  const currentDraft = draft;
  const account = getAccount(data, concept.accountId);

  async function save() {
    setSaving(true);
    setSaveError(undefined);

    try {
      await saveDraft();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function saveDraft() {
    await onSave(currentConcept.id, {
      name: currentDraft.name,
      description: currentDraft.description,
      audience: currentDraft.audience,
      pillars: currentDraft.pillars
        .split(",")
        .map((pillar) => pillar.trim())
        .filter(Boolean),
      voice: currentDraft.voice,
      visualGuidelines: currentDraft.visualGuidelines || undefined,
      captionGuidelines: currentDraft.captionGuidelines || undefined,
      metadata: {
        ...currentConcept.metadata,
        hashtagPolicy: currentDraft.hashtagPolicy,
        schedulePolicy: {
          cadence: currentDraft.scheduleCadence,
          preferredWindow: currentDraft.preferredWindow
        },
        workflowPolicy: {
          autoSchedule: currentDraft.autoSchedule,
          autoPublish: currentDraft.autoPublish
        }
      }
    });
  }

  return (
    <main className="content-area">
      <PageHeader
        eyebrow={accountLabel(account)}
        title={concept.name}
        actions={
          <button className="primary-button" disabled={saving} onClick={() => void save()} type="button">
            {saving ? "Saving" : "Save concept"}
          </button>
        }
      >
        {concept.description}
      </PageHeader>

      {saveError ? <ErrorState message={saveError} /> : null}

      <section className="editor-grid">
        <div className="panel">
          <h2>Profile</h2>
          <label>
            Name
            <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
          <label>
            Audience
            <textarea value={draft.audience} onChange={(event) => setDraft({ ...draft, audience: event.target.value })} />
          </label>
          <label>
            Pillars
            <input value={draft.pillars} onChange={(event) => setDraft({ ...draft, pillars: event.target.value })} />
          </label>
          <label>
            Voice
            <textarea value={draft.voice} onChange={(event) => setDraft({ ...draft, voice: event.target.value })} />
          </label>
        </div>

        <div className="panel">
          <h2>Visual identity</h2>
          <label>
            Visual guidelines
            <textarea value={draft.visualGuidelines} onChange={(event) => setDraft({ ...draft, visualGuidelines: event.target.value })} />
          </label>
          <h2>Caption identity</h2>
          <label>
            Caption guidelines
            <textarea value={draft.captionGuidelines} onChange={(event) => setDraft({ ...draft, captionGuidelines: event.target.value })} />
          </label>
          <label>
            Hashtag policy
            <textarea value={draft.hashtagPolicy} onChange={(event) => setDraft({ ...draft, hashtagPolicy: event.target.value })} />
          </label>
        </div>

        <div className="panel">
          <h2>Schedule policy</h2>
          <label>
            Cadence
            <input value={draft.scheduleCadence} onChange={(event) => setDraft({ ...draft, scheduleCadence: event.target.value })} />
          </label>
          <label>
            Preferred window
            <input value={draft.preferredWindow} onChange={(event) => setDraft({ ...draft, preferredWindow: event.target.value })} />
          </label>
          <div className="policy-readout">
            <span>Account timezone</span>
            <strong>{account?.schedulePolicy.timezone ?? "UTC"}</strong>
          </div>
          <div className="policy-readout">
            <span>Posts per day</span>
            <strong>{account?.schedulePolicy.maxPostsPerDay ?? 0}</strong>
          </div>
        </div>

        <div className="panel">
          <h2>Automation policy</h2>
          <label className="check-row">
            <input
              checked={draft.autoSchedule}
              onChange={(event) => setDraft({ ...draft, autoSchedule: event.target.checked })}
              type="checkbox"
            />
            Allow auto-schedule
          </label>
          <label className="check-row">
            <input
              checked={draft.autoPublish}
              onChange={(event) => setDraft({ ...draft, autoPublish: event.target.checked })}
              type="checkbox"
            />
            Allow auto-publish
          </label>
          <p className="muted-copy">Auto-publish still requires explicit account policy and a publisher plugin.</p>
        </div>
      </section>
    </main>
  );
}

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
