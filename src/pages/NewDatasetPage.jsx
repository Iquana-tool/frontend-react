import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDataset } from '../contexts/DatasetContext';
import { usePermissions } from '../hooks/usePermissions';
import { GLOBAL_ROLE_LABELS } from '../utils/permissions';
import { BASE_PATH } from '../api/config';
import { getMetricsCatalog } from '../api/quantifications';
import { fetchCalibrationKinds } from '../api/calibration';
import { getLabelSpaceConfig } from '../api/label_space';
import { DEFAULT_STACK_EXTENSIONS, fetchStackFormats, isStackFileName } from '../api/stacks';
import Wordmark from '../components/Wordmark';
import DocsLink from '../components/ui/DocsLink';
import ThemeToggle from '../components/ui/ThemeToggle';
import StepRail from '../components/datasets/creation/StepRail';
import SetupSummary from '../components/datasets/creation/SetupSummary';
import CreationProgress from '../components/datasets/creation/CreationProgress';
import {
  BasicsStep, ImagesStep, MetadataStep, TemplateStep, UnavailableStep,
} from '../components/datasets/creation/DataSteps';
import { CalibrationStep, LabelSpaceStep, QuantificationStep } from '../components/datasets/creation/DefinitionSteps';
import {
  AccessStep, AnnotationProfileStep, OrchestrationStep, ReviewProfileStep,
} from '../components/datasets/creation/WorkflowSteps';
import { createDatasetFromDraft } from '../components/datasets/creation/createFromDraft';
import { loadDatasetSetup } from '../components/datasets/creation/copySetup';
import {
  DRAFT_STORAGE_KEY, LAST_STEP_INDEX, STEPS, TEMPLATE_STEPS, deserializeDraft, draftHasContent, draftReducer,
  initialDraft, serializeDraft, stepByIndex, templateById,
} from '../components/datasets/creation/wizardModel';

/** Steps that render their own right-hand panel; the rest get "Setup so far". */
const OWN_ASIDE = new Set(['template', 'labels', 'quantification']);

const readStoredDraft = () => {
  try {
    const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
    const draft = stored && deserializeDraft(stored);
    return draft && draftHasContent(draft) ? draft : null;
  } catch {
    return null;
  }
};

const STEP_COMPONENTS = {
  template: TemplateStep,
  basics: BasicsStep,
  images: ImagesStep,
  metadata: MetadataStep,
  labels: LabelSpaceStep,
  quantification: QuantificationStep,
  calibration: CalibrationStep,
  annotation: AnnotationProfileStep,
  review: ReviewProfileStep,
  orchestration: OrchestrationStep,
  access: AccessStep,
};

/**
 * New dataset: a rail of steps (#40) that makes every setup decision once, up
 * front, and creates the dataset in one go at the end. Only the title is
 * required; every other step can be skipped and changed later.
 */
const NewDatasetPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { datasets, fetchDatasets } = useDataset();
  const { canCreateDatasets, globalRole } = usePermissions();

  const [restored] = useState(readStoredDraft);
  const [draft, dispatch] = useReducer(draftReducer, undefined, () => restored || initialDraft());
  const [currentIndex, setCurrentIndex] = useState(restored ? 1 : 0);
  const [showRestored, setShowRestored] = useState(Boolean(restored));
  const [phase, setPhase] = useState('edit'); // edit | creating | done | failed
  const [tasks, setTasks] = useState({});
  const [result, setResult] = useState(null);
  const [fatalError, setFatalError] = useState(null);

  // Server-side catalogs the steps render from.
  const [metrics, setMetrics] = useState(null);
  const [catalogError, setCatalogError] = useState(null);
  const [kinds, setKinds] = useState([]);
  const [labelSpaceConfig, setLabelSpaceConfig] = useState(null);
  const [stackExtensions, setStackExtensions] = useState(DEFAULT_STACK_EXTENSIONS);
  const [copyState, setCopyState] = useState({ loading: false, error: null });

  useEffect(() => {
    getMetricsCatalog().then((response) => setMetrics(response.metrics || []))
      .catch((error) => setCatalogError(error.message || 'unknown error'));
    fetchCalibrationKinds().then((response) => setKinds(response.kinds || [])).catch(() => setKinds([]));
    getLabelSpaceConfig().then(setLabelSpaceConfig).catch(() => setLabelSpaceConfig({ enabled: false }));
    fetchStackFormats().then((response) => {
      if (response?.extensions?.length) setStackExtensions(response.extensions);
    }).catch(() => {});
    if (!datasets?.length) fetchDatasets?.();
    // Load once on mount; the catalogs do not change while the page is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the draft (minus files) so a reload or a detour does not lose the setup.
  const [savedAt, setSavedAt] = useState(null);
  useEffect(() => {
    if (phase !== 'edit') return;
    try {
      if (draftHasContent(draft)) {
        localStorage.setItem(DRAFT_STORAGE_KEY, serializeDraft(draft));
        setSavedAt(Date.now());
      }
    } catch {
      // Storage full or blocked: the draft simply is not kept.
    }
  }, [draft, phase]);

  // Leaving mid-upload would abandon a half-filled dataset.
  useEffect(() => {
    if (phase !== 'creating') return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [phase]);

  const isStackFile = useCallback((name) => isStackFileName(name, stackExtensions), [stackExtensions]);

  const goTo = useCallback((target) => {
    const index = typeof target === 'number' ? target : STEPS.find((step) => step.id === target)?.index;
    if (index == null) return;
    dispatch({ type: 'visit', step: stepByIndex(currentIndex).id });
    setShowRestored(false);
    setCurrentIndex(index);
  }, [currentIndex]);

  const copySetup = useCallback(async (datasetId) => {
    if (!datasetId) {
      if (draft.copyFrom) dispatch({ type: 'clearTemplate' });
      return;
    }
    setCopyState({ loading: true, error: null });
    try {
      const config = await loadDatasetSetup(datasetId);
      dispatch({ type: 'applyCopy', config });
      setCopyState({ loading: false, error: null });
    } catch (error) {
      setCopyState({ loading: false, error: `That dataset's setup could not be read: ${error.message}` });
    }
  }, [draft.copyFrom]);

  const discard = () => {
    if (!window.confirm('Discard this setup and start over?')) return;
    try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch { /* nothing kept */ }
    dispatch({ type: 'reset' });
    setShowRestored(false);
    setCurrentIndex(0);
    setSavedAt(null);
  };

  const create = async () => {
    if (!draft.basics.title.trim()) {
      setCurrentIndex(1);
      return;
    }
    setPhase('creating');
    setTasks({});
    setFatalError(null);
    try {
      const outcome = await createDatasetFromDraft(draft, {
        isStackFile,
        inviteBaseUrl: `${window.location.origin}${BASE_PATH}`,
        onProgress: ({ task, status, detail, progress }) => setTasks((previous) => ({
          ...previous,
          [task]: {
            status,
            detail,
            progress: progress ?? (status === 'running' ? previous[task]?.progress : null),
          },
        })),
      });
      setResult(outcome);
      setPhase('done');
      try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch { /* nothing kept */ }
      fetchDatasets?.();
    } catch (error) {
      setFatalError(error.message || 'Unknown error.');
      setPhase('failed');
    }
  };

  const step = stepByIndex(currentIndex);
  const nextStep = stepByIndex(currentIndex + 1);
  const ctx = useMemo(() => ({
    datasets: datasets || [],
    copySetup,
    copyState,
    metrics,
    catalogError,
    kinds,
    labelSpaceConfig,
    stackExtensions,
    isStackFile,
    goTo,
  }), [datasets, copySetup, copyState, metrics, catalogError, kinds, labelSpaceConfig, stackExtensions, isStackFile, goTo]);

  if (!canCreateDatasets) return <Navigate to="/datasets" replace />;

  const StepComponent = STEP_COMPONENTS[step.id];
  const configuredEnough = currentIndex >= 6 || Boolean(draft.templateId || draft.copyFrom);
  const showSummary = phase === 'edit' && !OWN_ASIDE.has(step.id);
  const template = templateById(draft.templateId);

  const footerNote = () => {
    if (step.id === 'template') {
      if (template) return `${template.title} selected · fills ${TEMPLATE_STEPS.length} of 12 steps`;
      if (draft.copyFrom) return `Setup copied from ${draft.copyFrom.name}`;
      return 'No template selected';
    }
    return null;
  };

  return (
    <div className="h-screen flex flex-col bg-well">
      <header className="bg-p1 border-b border-ln shrink-0">
        <div className="px-6 py-4 flex items-center justify-between">
          <button type="button" onClick={() => navigate('/')} className="text-2xl font-semibold tracking-tight text-t1 hover:text-ac">
            <Wordmark />
          </button>
          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-t3">
                <User className="w-4 h-4" />
                <span className="font-medium text-t2">{user.display_name || user.username}</span>
                <span className="px-2 py-0.5 rounded-full bg-hv text-xs text-t2">{GLOBAL_ROLE_LABELS[globalRole]?.label || globalRole}</span>
              </span>
            )}
            <DocsLink className="flex items-center gap-2 bg-hv hover:bg-hv2 text-t2 hover:text-t1 py-2 px-4 rounded-lg transition-colors" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {phase === 'edit' && (
          <aside className="hidden lg:flex w-80 shrink-0 bg-p1 border-r border-ln">
            <StepRail
              draft={draft}
              currentIndex={currentIndex}
              onSelect={goTo}
              isStackFile={isStackFile}
              onBack={() => navigate('/datasets')}
              onCreate={create}
              canCreate={Boolean(draft.basics.title.trim())}
              configuredEnough={configuredEnough}
            />
          </aside>
        )}

        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-6 lg:px-12 py-10">
            {phase === 'edit' ? (
              <>
                <label className="lg:hidden block mb-6">
                  <span className="sr-only">Step</span>
                  <select value={currentIndex} onChange={(event) => goTo(Number(event.target.value))}
                    className="w-full px-4 py-2.5 bg-p1 border border-ln rounded-lg text-t1">
                    {STEPS.map((entry) => <option key={entry.id} value={entry.index}>{entry.index}. {entry.title}</option>)}
                  </select>
                </label>
                {showRestored && (
                  <p className="mb-6 text-sm text-t3">Restored your unfinished setup. <button type="button" onClick={discard} className="text-t2 underline hover:text-err">Start over</button></p>
                )}
                <div className={showSummary ? 'grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_22rem] gap-10' : ''}>
                  <div className="min-w-0">
                    {StepComponent
                      ? <StepComponent draft={draft} dispatch={dispatch} ctx={ctx} />
                      : <UnavailableStep stepId={step.id} />}
                  </div>
                  {showSummary && <SetupSummary draft={draft} kinds={kinds} isStackFile={isStackFile} />}
                </div>
              </>
            ) : (
              <CreationProgress
                tasks={tasks}
                result={result}
                fatalError={fatalError}
                draft={draft}
                onBackToRail={() => setPhase('edit')}
                onDatasets={() => navigate('/datasets')}
                onOpen={() => navigate(draft.orchestration.openAfterCreate
                  ? `/dataset/${result.datasetId}/model-orchestration`
                  : `/dataset/${result.datasetId}/datamanagement`)}
              />
            )}
          </div>

          {phase === 'edit' && (
            <footer className="shrink-0 border-t border-ln bg-p1 px-6 lg:px-12 py-4 flex items-center gap-4">
              {currentIndex > 1 && (
                <button type="button" onClick={() => goTo(currentIndex - 1)} className="inline-flex items-center gap-2 text-t2 hover:text-t1">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              )}
              <span className="text-sm text-t3">
                {footerNote() || (
                  <>
                    {savedAt ? 'Draft saved' : 'Not saved yet'}
                    {draftHasContent(draft) && <> · <button type="button" onClick={discard} className="text-t2 hover:text-err">Discard</button></>}
                  </>
                )}
              </span>
              <div className="ml-auto flex items-center gap-4">
                {step.id === 'template' && (
                  <button type="button" onClick={() => { dispatch({ type: 'clearTemplate' }); goTo(1); }} className="text-t2 hover:text-t1 font-medium">
                    Skip — no template
                  </button>
                )}
                {step.id !== 'template' && !step.required && nextStep && (
                  <button type="button" onClick={() => { dispatch({ type: 'skip', step: step.id }); setCurrentIndex(currentIndex + 1); }}
                    className="text-t2 hover:text-t1 font-medium">
                    Skip step
                  </button>
                )}
                {currentIndex < LAST_STEP_INDEX ? (
                  <button type="button" onClick={() => goTo(currentIndex + 1)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-onAccent font-medium hover:brightness-110">
                    Continue to {nextStep.title} <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button type="button" onClick={create} disabled={!draft.basics.title.trim()}
                    title={draft.basics.title.trim() ? undefined : 'Give the dataset a title in Basics first.'}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-onAccent font-medium hover:brightness-110 disabled:opacity-50">
                    <Check className="w-4 h-4" /> Create dataset
                  </button>
                )}
              </div>
            </footer>
          )}
        </main>
      </div>
    </div>
  );
};

export default NewDatasetPage;
