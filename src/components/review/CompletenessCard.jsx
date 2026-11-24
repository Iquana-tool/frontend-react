import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import Kbd from '../annotationPage/workspace/primitives/Kbd';
import { resolveLabelColor } from '../annotationPage/workspace/labelColorUtils';
import { fetchCompleteness, recordCompleteness } from '../../api/reviews';
import { useAuth } from '../../contexts/AuthContext';
import { useReviewSession } from '../../contexts/ReviewSessionContext';
import { useToast } from '../../contexts/ToastContext';
import { trackAnnotation } from '../../services/activityLog';
import {
  useCurrentMaskId,
  useDatasetLabels,
  useLabelColorOverrides,
  useObjectsList,
  useSceneGraphRelationships,
} from '../../stores/selectors/annotationSelectors';

/** The row that asks about relationships rather than about one label. */
const RELATIONSHIPS_ROW = 'relationships';

/**
 * Above this many labels the card asks only about the labels that are on the
 * image. A row per label is the point of the question, but a label space of
 * hundreds would turn one question into a form nobody fills in.
 */
const MAX_LABEL_ROWS = 10;

/** How another reviewer's stored answer reads beside a row. */
const ANSWER_WORDS = { complete: 'yes', incomplete: 'no', unsure: 'unsure' };

const ANSWERS = [
  { value: 'yes', label: 'Yes', on: 'bg-okBg border-okLn text-ok' },
  { value: 'no', label: 'No', on: 'bg-warnBg border-warnLn text-warn' },
  { value: 'unsure', label: 'Unsure', on: 'bg-revBg border-revLn text-rev' },
];

const isTyping = (target) =>
  target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;

/**
 * The completeness question, asked once per image at the end of its review.
 *
 * Reviewing objects one by one says nothing about the objects nobody drew, and a
 * count such as polyp density is only right when every polyp is outlined. So the
 * question is asked per label: the reviewer answers Yes, No or Unsure for each,
 * or Yes for all at once.
 *
 * Every answer is stored on the server. A "No" also becomes a mask-level
 * send-back with the reason "objects are missing", naming the labels, so it
 * reaches the annotator through the correction queue like any other; an
 * "Unsure" queues the image for a second reviewer. Answers other reviewers gave
 * are shown beside each row, so a second look starts from what was doubted.
 *
 * Takes the action bar's place under the canvas while it is open.
 */
const CompletenessCard = () => {
  const { pendingCompleteness, answerCompleteness } = useReviewSession();
  const { addToast } = useToast();
  const currentMaskId = useCurrentMaskId();
  const objects = useObjectsList();
  const datasetLabels = useDatasetLabels();
  const colorOverrides = useLabelColorOverrides();
  const relationships = useSceneGraphRelationships();
  const { user } = useAuth();

  const [answers, setAnswers] = useState({});
  // Other reviewers' current answers, keyed like the rows.
  const [earlier, setEarlier] = useState({});
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const maskId = pendingCompleteness?.mask_id ?? null;
  const ready = maskId != null && currentMaskId === maskId;

  // A new image starts with a blank form, plus what others answered before.
  useEffect(() => {
    setAnswers({});
    setNote('');
    setEarlier({});
    if (maskId == null) return undefined;
    let cancelled = false;
    fetchCompleteness(maskId)
      .then((response) => {
        if (cancelled) return;
        const byRow = {};
        (response?.checks || [])
          .filter((check) => check.created_by !== user?.username)
          .forEach((check) => {
            const key = check.item === RELATIONSHIPS_ROW ? RELATIONSHIPS_ROW : String(check.label_id);
            (byRow[key] ||= []).push(`${check.created_by || 'someone'}: ${ANSWER_WORDS[check.answer]}`);
          });
        setEarlier(byRow);
      })
      // The earlier answers are a hint; the card works without them.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [maskId, user?.username]);

  const rows = useMemo(() => {
    const counts = new Map();
    objects.forEach((object) => {
      if (object.labelId == null) return;
      counts.set(Number(object.labelId), (counts.get(Number(object.labelId)) || 0) + 1);
    });
    const labels = datasetLabels || [];
    const shown =
      labels.length <= MAX_LABEL_ROWS
        ? labels
        : labels.filter((label) => counts.has(Number(label.id)));
    const labelRows = shown.map((label) => ({
      key: String(label.id),
      name: label.name,
      color: resolveLabelColor(label, colorOverrides),
      count: counts.get(Number(label.id)) || 0,
      unit: 'object',
    }));
    if (!relationships?.length) return labelRows;
    return [
      ...labelRows,
      { key: RELATIONSHIPS_ROW, name: 'Relationships', count: relationships.length, unit: 'relationship' },
    ];
  }, [objects, datasetLabels, colorOverrides, relationships]);

  const missing = rows.filter((row) => answers[row.key] === 'no');
  const answeredCount = rows.filter((row) => answers[row.key]).length;

  const save = useCallback(
    async (given) => {
      if (!ready || saving) return;
      const answered = rows
        .filter((row) => given[row.key])
        .map((row) => ({
          labelId: row.key === RELATIONSHIPS_ROW ? null : Number(row.key),
          answer: given[row.key],
        }));
      // An image with no labels to ask about has nothing to store.
      if (answered.length === 0) {
        answerCompleteness(maskId, 'complete');
        return;
      }

      setSaving(true);
      try {
        const response = await recordCompleteness(maskId, {
          answers: answered,
          note: note.trim() || null,
        });
        answerCompleteness(maskId, response.verdict);
      } catch (error) {
        addToast({
          type: 'error',
          message: `Could not save the answer: ${(error.message || 'Unknown error').replace(/^API Error:\s*/i, '')}`,
        });
      } finally {
        setSaving(false);
      }
    },
    [ready, saving, rows, maskId, note, answerCompleteness, addToast]
  );

  const saveAllComplete = useCallback(
    () => save(Object.fromEntries(rows.map((row) => [row.key, 'yes']))),
    [save, rows]
  );

  const skip = useCallback(() => {
    trackAnnotation('review.completeness', {
      imageId: pendingCompleteness?.image_id ?? null,
      payload: { mask_id: maskId, verdict: 'skipped' },
    });
    answerCompleteness(maskId, 'skipped');
  }, [maskId, pendingCompleteness, answerCompleteness]);

  // `Y` answers Yes for everything; `⏎` saves what was picked.
  useEffect(() => {
    if (!ready) return undefined;
    const onKey = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
      if (event.key.toUpperCase() === 'Y') {
        event.preventDefault();
        saveAllComplete();
      } else if (event.key === 'Enter' && answeredCount > 0) {
        event.preventDefault();
        save(answers);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ready, saveAllComplete, save, answers, answeredCount]);

  if (!pendingCompleteness) return null;

  return (
    <div className="absolute left-1/2 bottom-4 -translate-x-1/2 z-[70] w-[620px] max-w-[calc(100%-28px)]">
      <section
        aria-labelledby="completeness-title"
        className="rounded-12 bg-glass border border-revLn shadow-bar backdrop-blur-sm flex flex-col"
      >
        <div className="px-[14px] pt-[11px] pb-[9px] border-b border-ln">
          <h2 id="completeness-title" className="text-modaltitle font-bold text-t1">
            Does this image look completely annotated?
          </h2>
          <p className="text-ctl text-t2 mt-[2px]">
            Answer per label, or once for everything. A “No” goes back to the annotator.
          </p>
        </div>

        {!ready ? (
          <div className="flex items-center gap-[7px] px-[14px] py-[14px] text-row text-t3">
            <Loader2 size={13} className="animate-spin" />
            Loading the image…
          </div>
        ) : (
          <div className="px-[14px] py-[4px] max-h-[236px] overflow-y-auto">
            {rows.length === 0 && (
              <p className="py-[10px] text-row text-t3">
                This image has no labelled objects. Use the buttons below to answer for the whole image.
              </p>
            )}
            {rows.map((row) => (
              <div key={row.key} className="flex items-center gap-[9px] h-[32px]">
                {row.key === RELATIONSHIPS_ROW ? (
                  <ArrowRight size={11} className="text-t2 flex-none" />
                ) : (
                  <span className="w-[9px] h-[9px] rounded-[2px] flex-none" style={{ background: row.color }} />
                )}
                <span className="flex-1 min-w-0 truncate text-row text-t1">
                  {row.name}{' '}
                  <span className="text-t3">
                    · {row.count} {row.unit}
                    {row.count === 1 ? '' : 's'}
                  </span>
                  {earlier[row.key] && (
                    <span className="text-ctl text-warn"> · {earlier[row.key].join(', ')}</span>
                  )}
                </span>
                <div role="radiogroup" aria-label={`${row.name} complete?`} className="flex gap-[5px]">
                  {ANSWERS.map((answer) => {
                    const selected = answers[row.key] === answer.value;
                    return (
                      <button
                        key={answer.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setAnswers((current) => ({ ...current, [row.key]: answer.value }))}
                        className={`h-[23px] px-[9px] rounded-6 border text-ctl font-semibold transition-colors ${
                          selected ? answer.on : 'border-ln2 text-t2 hover:bg-hv'
                        }`}
                      >
                        {answer.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {missing.length > 0 && (
              <label className="flex items-center gap-[8px] h-[28px] my-[5px] px-[9px] rounded-6 border border-warnLn bg-app">
                <span className="text-ctl font-semibold text-warn flex-none">What is missing?</span>
                <input
                  type="text"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  // The window shortcut ignores keys typed into fields, so the
                  // note saves on Enter here, as the ⏎ on the button promises.
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      save(answers);
                    }
                  }}
                  placeholder="Optional note for the annotator"
                  className="flex-1 min-w-0 bg-transparent text-row text-t1 placeholder:text-t3 focus:outline-none"
                />
              </label>
            )}
          </div>
        )}

        <div className="flex items-center gap-[7px] px-[14px] py-[9px] border-t border-ln">
          <span className="flex-1 min-w-0 text-ctl text-t2">
            {missing.length > 0
              ? `Sends the image back: objects are missing (${missing.map((row) => row.name).join(', ')}).`
              : 'Rows you leave open are recorded as not answered.'}
          </span>
          <button
            type="button"
            onClick={skip}
            disabled={saving}
            className="h-[28px] px-[9px] rounded-7 text-btn font-semibold text-t3 hover:text-t1 transition-colors disabled:opacity-40"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={saveAllComplete}
            disabled={!ready || saving}
            className="h-[28px] px-[10px] flex items-center gap-[6px] rounded-7 border border-ln2 text-btn font-semibold text-t1 hover:bg-hv transition-colors disabled:opacity-40"
          >
            All complete
            <Kbd>Y</Kbd>
          </button>
          <button
            type="button"
            onClick={() => save(answers)}
            disabled={!ready || saving || answeredCount === 0}
            className="h-[28px] px-[11px] flex items-center gap-[6px] rounded-7 bg-accent text-onAccent text-btn font-bold hover:brightness-110 transition-[filter] disabled:opacity-40"
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            Save &amp; continue
            <Kbd tone="solid">⏎</Kbd>
          </button>
        </div>
      </section>
    </div>
  );
};

export default CompletenessCard;
