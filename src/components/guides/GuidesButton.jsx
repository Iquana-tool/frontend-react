import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { BookOpen, CheckCircle2, Circle, CircleDot, GraduationCap, RotateCcw } from 'lucide-react';
import ToolbarButton from '../annotationPage/workspace/primitives/ToolbarButton';
import Switch from '../annotationPage/workspace/primitives/Switch';
import useGuideStore from './guideStore';
import { availableGuides } from './guideEligibility';
import { ANNOTATION_GUIDES, GUIDE_GROUPS, WELCOME_GUIDE_ID } from './annotationGuides';
import useAnnotationStore from '../../stores/useAnnotationStore';
import { usePermissions } from '../../hooks/usePermissions';
import { DOCS, openDocs } from '../../constants/docs';

const STATUS_ICON = {
  completed: { icon: CheckCircle2, className: 'text-ok', label: 'Done' },
  in_progress: { icon: CircleDot, className: 'text-ac', label: 'In progress' },
};

const actionLabel = (status) =>
  status === 'completed' ? 'Replay' : status === 'in_progress' ? 'Resume' : 'Start';

const GuideRow = ({ guide, entry, onStart }) => {
  const status = entry?.status;
  const { icon: Icon, className, label } = STATUS_ICON[status] || {
    icon: Circle,
    className: 'text-t3',
    label: 'Not started',
  };

  return (
    <div className="flex items-start gap-[8px] px-[8px] py-[7px] rounded-7 hover:bg-hv">
      <Icon size={14} strokeWidth={2} className={`mt-[1px] flex-none ${className}`} aria-label={label} />
      <div className="flex-1 min-w-0">
        <div className="text-row font-semibold text-t1">{guide.title}</div>
        <div className="text-meta leading-[1.45] text-t3">
          {status === 'in_progress'
            ? `Step ${(entry.step || 0) + 1} of ${guide.steps.length}`
            : guide.summary}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onStart(guide.id, status === 'completed')}
        className={`flex-none h-[22px] px-[8px] rounded-6 text-sect font-bold transition-colors ${
          status === 'completed'
            ? 'text-t2 hover:bg-hv2 hover:text-t1'
            : 'bg-acS text-ac hover:brightness-110'
        }`}
      >
        {actionLabel(status)}
      </button>
    </div>
  );
};

/**
 * The Guides panel: every guide this user can follow here, with where they are
 * in each, plus the automatic-tips switch. Always reachable, tips on or off.
 */
const GuidesPanel = ({ guides, onClose, triggerRef }) => {
  const ref = useRef(null);
  const progress = useGuideStore((state) => state.guides);
  const tipsEnabled = useGuideStore((state) => state.tipsEnabled);
  const setTipsEnabled = useGuideStore((state) => state.setTipsEnabled);
  const startGuide = useGuideStore((state) => state.startGuide);
  const resetGuides = useGuideStore((state) => state.resetGuides);

  // Same dismissal as the toolbar menus: outside click (capture phase) or Escape.
  useEffect(() => {
    const onPointerDown = (event) => {
      if (ref.current?.contains(event.target) || triggerRef.current?.contains(event.target)) return;
      onClose();
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, triggerRef]);

  const done = guides.filter((guide) => progress[guide.id]?.status === 'completed').length;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Guides"
      data-guide-float=""
      className="absolute top-[34px] right-0 z-[80] w-[340px] max-h-[min(560px,75vh)] flex flex-col rounded-9 bg-p2 border border-ln2 shadow-dropdown animate-dcPop"
    >
      <div className="px-[12px] pt-[10px] pb-[8px] border-b border-ln flex-none">
        <div className="flex items-baseline gap-[8px]">
          <h2 className="flex-1 text-modaltitle font-bold text-t1">Guides</h2>
          <span className="font-mono text-meta text-t3 tabular-nums">
            {done} / {guides.length} done
          </span>
        </div>
        <p className="mt-[3px] text-meta leading-[1.45] text-t3">
          Short walkthroughs on your own image. Each step moves on when you do it.
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-[5px]">
        {guides.length === 0 && (
          <p className="px-[8px] py-[16px] text-center text-meta text-t3">
            No guides apply to your role on this dataset.
          </p>
        )}
        {GUIDE_GROUPS.map((group) => {
          const inGroup = guides.filter((guide) => guide.group === group);
          if (inGroup.length === 0) return null;
          return (
            <div key={group} className="mb-[4px]">
              <div className="px-[8px] pt-[6px] pb-[3px] text-sect font-bold tracking-[.09em] uppercase text-t3">
                {group}
              </div>
              {inGroup.map((guide) => (
                <GuideRow
                  key={guide.id}
                  guide={guide}
                  entry={progress[guide.id]}
                  onStart={(id, restart) => startGuide(id, { restart })}
                />
              ))}
            </div>
          );
        })}
      </div>

      <div className="flex-none flex flex-col gap-[7px] px-[12px] py-[9px] border-t border-ln">
        <label className="flex items-center gap-[8px] cursor-pointer">
          <span className="flex-1">
            <span className="block text-row font-semibold text-t1">Automatic tips</span>
            <span className="block text-meta text-t3">
              Suggest a guide the first time you reach a feature.
            </span>
          </span>
          <Switch checked={tipsEnabled} onChange={setTipsEnabled} label="Automatic tips" />
        </label>
        <div className="flex items-center gap-[10px]">
          <button
            type="button"
            onClick={resetGuides}
            className="flex items-center gap-[4px] text-meta font-semibold text-t3 hover:text-t1 transition-colors"
          >
            <RotateCcw size={11} strokeWidth={2} />
            Reset progress
          </button>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => openDocs(DOCS.home)}
            className="flex items-center gap-[4px] text-meta font-semibold text-t3 hover:text-t1 transition-colors"
          >
            <BookOpen size={11} strokeWidth={2} />
            Full documentation
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Toolbar entry to the Guides panel.
 *
 * Carries a dot until the first guide is finished or waved away: the dot is how
 * the panel gets found without anything being pushed at the user.
 */
const GuidesButton = ({ guides = ANNOTATION_GUIDES, welcomeGuideId = WELCOME_GUIDE_ID }) => {
  const { datasetId } = useParams();
  const { can } = usePermissions(datasetId);
  const promptedModels = useAnnotationStore((state) => state.models.availablePromptedModels);
  const open = useGuideStore((state) => state.panelOpen);
  const togglePanel = useGuideStore((state) => state.togglePanel);
  const setPanelOpen = useGuideStore((state) => state.setPanelOpen);
  const welcomeStatus = useGuideStore((state) => state.guides[welcomeGuideId]?.status);
  const welcome = useGuideStore((state) => state.welcome);
  const triggerRef = useRef(null);
  const closePanel = useCallback(() => setPanelOpen(false), [setPanelOpen]);

  const visible = useMemo(
    () => availableGuides(guides, { can, state: { models: { availablePromptedModels: promptedModels } } }),
    [guides, can, promptedModels]
  );

  const showDot =
    visible.some((guide) => guide.id === welcomeGuideId)
    && welcomeStatus !== 'completed'
    && welcomeStatus !== 'dismissed'
    && welcome !== 'dismissed';

  return (
    <div ref={triggerRef} className="relative flex-none">
      <ToolbarButton
        icon={GraduationCap}
        label="Guides"
        active={open}
        onClick={togglePanel}
        data-guide="guides-button"
        aria-expanded={open}
      />
      {showDot && (
        <span
          aria-hidden
          className="absolute top-[3px] right-[3px] w-[6px] h-[6px] rounded-full bg-ac pointer-events-none"
        />
      )}
      {open && (
        <GuidesPanel guides={visible} onClose={closePanel} triggerRef={triggerRef} />
      )}
    </div>
  );
};

export default GuidesButton;
