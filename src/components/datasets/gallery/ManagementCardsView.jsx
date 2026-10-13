import React, { useEffect, useState } from 'react';
import { Database, Brain, BarChart3, Tag, SquarePen, Download, Eye, GraduationCap, Users2, ClipboardCheck, Ruler, Wrench, Settings, HelpCircle, Wand2, Cpu, ChevronRight } from 'lucide-react';
import WorkflowCard from './WorkflowCard';
import ToolRow from './ToolRow';
import DatasetActivityCard from './DatasetActivityCard';
import ModelSuggestionsCard from './ModelSuggestionsCard';
import TimeRangeToggle from './TimeRangeToggle';
import { ACTIVITY_WINDOWS } from '../../../utils/datasetActivity';
import PhaseProgressBar from '../PhaseProgressBar';
import RoleBadge from '../RoleBadge';
import { usePermissions } from '../../../hooks/usePermissions';
import { Permission } from '../../../utils/permissions';
import { isAiToolEnabled } from '../../../utils/aiTools';
import { OVERALL_STATES, getPhase } from '../../../utils/imageStatus';
import { useGalleryStats } from '../../../stores/selectors';
import { fetchReviewSummary, fetchCorrectionSummary } from '../../../api/reviews';
import { DOCS, openDocs } from '../../../constants/docs';

/**
 * The tool groups shown as side-by-side lists below the workflow, in display
 * order. Each card names its `group` by id; a group with no permitted cards for
 * the current role is not rendered at all (see `toolGroups` below). The
 * annotation workflow is not listed here: it gets its own row of cards.
 */
const TOOL_GROUPS = [
  { id: 'data', title: 'Data & Analysis' },
  { id: 'models', title: 'Artificial Intelligence' },
  { id: 'configurations', title: 'Configuration' },
];

/** The small all-caps heading used above every section of the page. */
const SectionHeading = ({ children }) => (
  <h3 className="text-xs font-semibold uppercase tracking-wide text-t3 mb-2.5">{children}</h3>
);

/**
 * The dataset's action grid.
 *
 * Each card declares the permission it needs; cards the current role cannot use
 * are left out entirely rather than shown greyed out — a reviewer has no way to
 * grant themselves upload rights, so a disabled "Data Management" tile would be
 * noise. Everything is still re-checked server-side.
 */
const ManagementCardsView = ({
  onDataManagementClick,
  onModelZooClick,
  onQuantificationsClick,
  onAnnotationClick,
  onLabelManagementClick,
  onExportDatasetClick,
  onModelTrainingClick,
  onModelOrchestrationClick,
  onBatchInferenceClick,
  onBrowseAnnotations,
  onManageAccessClick,
  onCalibrateClick,
  onReviewClick,
  onCorrectClick,
  dataset,
}) => {
  const { can, canAny, role } = usePermissions(dataset);
  // Read from the store rather than taking a prop: this view is rendered as the
  // layout's children, so the stats the layout already fetched cannot be handed
  // down without threading them through DatasetGallery first.
  const stats = useGalleryStats();
  // One time range for both summaries in the Activity section.
  const [activityDays, setActivityDays] = useState(ACTIVITY_WINDOWS[0].days);
  const canReview = can(Permission.REVIEW_APPROVE);
  const canCorrect = can(Permission.ANNOTATION_EDIT_OWN);

  // The pending-instance count on the Review card. Loaded here rather than in
  // the card so a failed fetch degrades to a card without a number, not an
  // empty tile.
  const [reviewSummary, setReviewSummary] = useState(null);
  useEffect(() => {
    if (!dataset?.id || !canReview) return undefined;
    let cancelled = false;
    fetchReviewSummary(dataset.id)
      .then((response) => {
        if (!cancelled && response?.success) setReviewSummary(response.summary);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [dataset?.id, canReview]);

  // The sent-back count on the Correct card. Loaded alongside the review summary,
  // and for the same reason kept here so a failed fetch degrades to a numberless
  // card rather than an empty tile.
  const [correctionSummary, setCorrectionSummary] = useState(null);
  useEffect(() => {
    if (!dataset?.id || !canCorrect) return undefined;
    let cancelled = false;
    fetchCorrectionSummary(dataset.id)
      .then((response) => {
        if (!cancelled && response?.success) setCorrectionSummary(response.summary);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [dataset?.id, canCorrect]);

  const canAnnotate = can(Permission.ANNOTATION_CREATE);
  // Calibration is a curator-level capability, and the two calibration kinds are
  // granted together, so either one is enough to make the card worth showing.
  const canCalibrate = canAny([Permission.PIXEL_SCALE_SET, Permission.CALIBRATION_SET]);

  // The Annotation card used to carry its own "N in progress, M not started"
  // subcaption from the annotation-queue summary. The phase bar below now says
  // exactly that, in the same units, so the fetch and the caption both went.

  // Per-phase progress, from the same store entry the dataset overview reads.
  // `total` is the image count and is shared by all three bars, so they compare.
  const phaseTotal =
    stats?.total ||
    OVERALL_STATES.reduce((acc, state) => acc + (stats?.overall?.[state.key] || 0), 0);

  /** The compact bar for a card's phase, or null for a card that has no phase. */
  const phaseBar = (phaseKey) => {
    const phase = phaseKey ? getPhase(phaseKey) : null;
    if (!phase || !phaseTotal) return null;
    return (
      <PhaseProgressBar
        phase={phase}
        counts={stats?.[phase.key]}
        total={phaseTotal}
        compact
      />
    );
  };

  const openRejections = correctionSummary?.open_rejections;
  const correctTone = openRejections > 0 ? 'attention' : 'muted';
  const correctStat =
    openRejections == null
      ? null
      : openRejections === 1
      ? '1 instance sent back for correction'
      : openRejections > 1
      ? `${openRejections} instances sent back for correction`
      : 'Nothing sent back for correction';

  const pendingInstances = reviewSummary?.pending_instances;
  const reviewedInstances = reviewSummary?.reviewed_instances ?? 0;
  const reviewTone = pendingInstances > 0 ? 'attention' : 'muted';
  const reviewStat =
    pendingInstances == null
      ? null
      : pendingInstances === 1
      ? 'There is 1 instance to review'
      : pendingInstances > 1
      ? `There are ${pendingInstances} instances to review`
      : reviewedInstances > 0
      ? `${reviewedInstances} reviewed instance${
          reviewedInstances === 1 ? '' : 's'
        } available for re-review`
      : 'Nothing waiting for review right now';

  const cards = [
    {
      // First card of the workflow, matching the order of the phases themselves.
      // It opens the annotation canvas straight into its Calibrate tab rather than
      // being a page of its own: calibrating means looking at the image, at the
      // same zoom and pan as annotating it, which is why Calibrate is a mode there.
      id: 'calibrate',
      group: 'annotation',
      phase: 'calibrate',
      icon: Ruler,
      title: 'Calibrate',
      description: 'Set scale and colour references',
      onClick: onCalibrateClick,
      permitted: canCalibrate,
      color: 'calibrate',
    },
    {
      id: 'annotation',
      group: 'annotation',
      phase: 'annotate',
      icon: SquarePen,
      title: 'Annotation',
      description: 'Draw instances on the images',
      onClick: onAnnotationClick,
      permitted: canAnnotate,
      color: 'annotate',
    },
    {
      id: 'review',
      group: 'annotation',
      phase: 'review',
      icon: ClipboardCheck,
      title: 'Review',
      description: 'Approve or send back instances',
      stat: reviewStat,
      statTone: reviewTone,
      onClick: onReviewClick,
      permitted: canReview,
      color: 'review',
    },
    {
      id: 'correct',
      group: 'annotation',
      icon: Wrench,
      title: 'Correct',
      description: 'Fix instances sent back to you',
      stat: correctStat,
      statTone: correctTone,
      onClick: onCorrectClick,
      permitted: canCorrect,
      color: 'rose',
    },
    {
      // The read-only counterpart for anyone who can see annotations but not make
      // them. Annotators and above reach the same view from inside the editor, so
      // this card only earns its space when the editor is unavailable.
      id: 'browse-annotations',
      group: 'annotation',
      icon: Eye,
      title: 'Browse Annotations',
      description: 'Look through the images and their annotations without editing anything',
      onClick: onBrowseAnnotations,
      permitted: can(Permission.ANNOTATION_READ) && !can(Permission.ANNOTATION_CREATE),
      color: 'accent',
    },
    {
      id: 'data-management',
      group: 'data',
      icon: Database,
      title: 'Data Management',
      description: 'Upload, organise and manage images and files',
      onClick: onDataManagementClick,
      // Viewing the gallery only needs read; the upload/delete controls inside it
      // are gated separately.
      permitted: can(Permission.IMAGE_READ),
      color: 'accent',
    },
    {
      id: 'label-management',
      group: 'data',
      icon: Tag,
      title: 'Label Management',
      description: 'Create, edit and organise the label hierarchy',
      onClick: onLabelManagementClick,
      permitted: can(Permission.LABEL_MANAGE),
      color: 'accent',
    },
    {
      id: 'model-zoo',
      group: 'models',
      icon: Brain,
      title: 'Model Zoo',
      description: 'Browse and manage AI models for training and inference',
      onClick: onModelZooClick,
      permitted: canAny([Permission.AI_INTERACTIVE, Permission.AI_BATCH_INFER]),
      color: 'accent',
    },
    {
      id: 'model-orchestration',
      group: 'models',
      icon: Cpu,
      title: 'Model Orchestration',
      description: 'Default models and per-label routing',
      onClick: onModelOrchestrationClick,
      permitted: canAny([Permission.AI_INTERACTIVE, Permission.AI_BATCH_INFER]),
      color: 'accent',
    },
    {
      id: 'model-training',
      group: 'models',
      icon: GraduationCap,
      title: 'Model Training',
      description: 'Train a segmentation model and watch it live',
      onClick: onModelTrainingClick,
      permitted: can(Permission.AI_TRAIN) && isAiToolEnabled(dataset, 'training'),
      color: 'accent',
    },
    {
      id: 'batch-inference',
      group: 'models',
      icon: Wand2,
      title: 'Batch Inference',
      description: 'Run models over the whole dataset, label by label',
      onClick: onBatchInferenceClick,
      permitted: can(Permission.AI_BATCH_INFER) && isAiToolEnabled(dataset, 'batch_inference'),
      color: 'accent',
    },
    {
      id: 'quantifications',
      group: 'data',
      icon: BarChart3,
      title: 'Quantifications',
      description: 'Measure and analyse your annotated data',
      onClick: onQuantificationsClick,
      permitted: can(Permission.EXPORT_QUANTIFICATION),
      color: 'green',
    },
    {
      id: 'export-dataset',
      group: 'data',
      icon: Download,
      title: 'Export Dataset',
      description: 'Download in IQUANA archive or COCO format.',
      onClick: onExportDatasetClick,
      permitted: can(Permission.EXPORT_ANNOTATIONS),
      color: 'amber',
    },
    {
      id: 'manage-access',
      group: 'configurations',
      icon: Users2,
      title: 'Manage Access',
      description: 'Who can see, annotate and review, and how work is reviewed',
      onClick: onManageAccessClick,
      // Curators can see and invite; only owners can change roles. Either is
      // enough to make the page worth opening.
      permitted: canAny([Permission.MEMBER_LIST, Permission.MEMBER_GRANT, Permission.INVITE_CREATE]),
      color: 'accent',
    },
    {
      // Placeholder: will open a settings page. Dysfunctional for now.
      id: 'settings',
      group: 'configurations',
      icon: Settings,
      title: 'Settings',
      description: 'View and change all settings for this dataset',
      permitted: true,
      color: 'slate',
      disabled: true,
    },
    {
      // The documentation is a separate site, so this card leaves the app rather
      // than routing anywhere. It is permitted for everyone: whatever a role can
      // or cannot do here, reading about it should never be gated.
      id: 'help',
      group: 'configurations',
      icon: HelpCircle,
      title: 'Help',
      description: 'Read the documentation (opens in a new tab)',
      onClick: () => openDocs(DOCS.home),
      external: true,
      permitted: true,
      color: 'accent',
    },
  ].filter((card) => card.permitted);

  // A description that is empty or just repeats the name says nothing new, so
  // the line is left out rather than filled with generic text.
  const description = dataset?.description?.trim();
  const showDescription =
    Boolean(description) && description !== dataset?.name?.trim();

  // The workflow cards get their own row; everything else is a tool, listed
  // under its group. A group with no permitted cards for the current role is
  // dropped entirely, heading included.
  const workflowCards = cards.filter((card) => card.group === 'annotation');
  const toolGroups = TOOL_GROUPS.map((group) => ({
    ...group,
    cards: cards.filter((card) => card.group === group.id),
  })).filter((group) => group.cards.length > 0);

  return (
    <div className="overflow-y-auto bg-app p-4 sm:p-5 lg:p-6 h-full">
      <h2 className="sr-only">{dataset?.name || 'Dataset overview'}</h2>
      <div className="w-full max-w-[1400px] mx-auto space-y-6">
        {/* The dataset's name is already in the top bar, highlighted as the
            current page, so it is not repeated as a visible heading here. The
            heading stays for screen readers so the page still has a title. */}
        {(role || showDescription) && (
          <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {role && <RoleBadge role={role} showDescription />}
            {showDescription && (
              <p className="text-sm text-t2 max-w-3xl">{description}</p>
            )}
          </header>
        )}

        {workflowCards.length > 0 && (
          <section aria-label="Annotation workflow">
            <SectionHeading>Annotation workflow</SectionHeading>
            {/* Left to right in the order the work happens. On wide screens a
                chevron sits in the gap between neighbours to make that order
                explicit; on narrower screens the grid wraps and the chevrons
                would point at nothing, so they are hidden. */}
            <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {workflowCards.map((card, index) => (
                <li key={card.id} className="relative">
                  <WorkflowCard
                    icon={card.icon}
                    title={card.title}
                    description={card.description}
                    stat={card.stat}
                    statTone={card.statTone}
                    onClick={card.onClick}
                    color={card.color}
                    progress={phaseBar(card.phase)}
                  />
                  {index < workflowCards.length - 1 && (
                    <ChevronRight
                      className="hidden lg:block absolute top-1/2 -right-[14px] -translate-y-1/2 w-3 h-3 text-t3"
                      aria-hidden="true"
                    />
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        {toolGroups.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
            {toolGroups.map((group) => (
              <section key={group.id} aria-label={group.title}>
                <SectionHeading>{group.title}</SectionHeading>
                <div className="bg-p1 border border-ln rounded-xl overflow-hidden divide-y divide-ln">
                  {group.cards.map((card) => (
                    <ToolRow
                      key={card.id}
                      icon={card.icon}
                      title={card.title}
                      description={card.description}
                      onClick={card.onClick}
                      color={card.color}
                      disabled={card.disabled}
                      external={card.external}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {dataset?.id && can(Permission.DATASET_READ) && (
          <section aria-label="Activity">
            <div className="flex items-center justify-between gap-4 mb-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-t3">Activity</h3>
              <TimeRangeToggle days={activityDays} onChange={setActivityDays} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <section aria-label="People">
                <h4 className="text-sm font-semibold text-t1 mb-2">People</h4>
                <DatasetActivityCard datasetId={dataset.id} days={activityDays} />
              </section>
              <section aria-label="Model suggestions">
                <h4 className="text-sm font-semibold text-t1 mb-2">Model suggestions</h4>
                <ModelSuggestionsCard datasetId={dataset.id} days={activityDays} />
              </section>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ManagementCardsView;
