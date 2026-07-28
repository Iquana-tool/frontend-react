import React from "react";
import {
  Wrench,
  GraduationCap,
  Lightbulb,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  MousePointerClick,
  RefreshCw,
  Hash,
  Boxes,
  Wand2,
  Scan,
  Star,
} from "lucide-react";
import { getTaskMeta, TASK_ORDER } from "../../constants/tasks";

// A model is model-centric now: it can serve several tasks. The header tile is
// keyed by the model's first (primary) task; the capability chips below list
// every task it can do.
const TASK_VISUAL = {
  "prompted-segmentation": { Icon: MousePointerClick, tile: "from-sky-500 to-blue-500" },
  "instance-suggestion": { Icon: Wand2, tile: "from-violet-500 to-purple-500" },
  "instance-segmentation": { Icon: Boxes, tile: "from-amber-500 to-orange-500" },
};
const DEFAULT_VISUAL = { Icon: Scan, tile: "from-teal-500 to-cyan-500" };

// Order a model's tasks by the canonical task order for stable chip layout.
const orderTasks = (tasks) =>
  [...(tasks || [])].sort((a, b) => TASK_ORDER.indexOf(a) - TASK_ORDER.indexOf(b));

const ModelCard = ({ model, isFavorite = false, onToggleFavorite, onAction }) => {
  const handleAction = (actionType) => onAction?.(model, actionType);

  const tasks = orderTasks(model.tasks);
  const primaryTask = tasks[0];
  const { Icon, tile } = TASK_VISUAL[primaryTask] || DEFAULT_VISUAL;

  const badges = Array.isArray(model.badges) ? model.badges : [];
  const promptTypes = Array.isArray(model.promptTypesSupported) ? model.promptTypesSupported : [];
  const isReady = model.status !== "not_ready";
  const showFinetuning = model.trainable === true;

  // Descriptor chips are metadata that isn't a task or an action. Drop the raw
  // "task"/"tasks" tags (the capability chips already convey them).
  const tags = (Array.isArray(model.tags) ? model.tags : []).filter((t) => {
    const key = String(t.key || "").toLowerCase();
    return key !== "task" && key !== "tasks" && !key.startsWith("task_");
  });

  const capabilities = [
    model.pretrained && { label: "Pretrained", className: "bg-green-50 text-green-700" },
    model.refinementSupported && {
      label: "Refinement",
      className: "bg-teal-50 text-teal-700",
      Icon: RefreshCw,
    },
    showFinetuning && {
      label: "Fine-tune on dataset",
      className: "bg-purple-50 text-purple-700",
      Icon: GraduationCap,
    },
  ].filter(Boolean);

  return (
    <div className="group flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-gray-300 hover:-translate-y-0.5 transition-all duration-200">
      {/* Header: icon + name + status + favorite */}
      <div className="flex items-start gap-3 p-5 pb-4">
        <div
          className={`shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br ${tile} flex items-center justify-center shadow-sm`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold text-gray-900 leading-snug truncate">
              {model.name}
            </h3>
            <div className="flex items-center gap-1.5 shrink-0">
              {model.status && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    isReady ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                  }`}
                  title={isReady ? "Ready to use" : "Needs training before use"}
                >
                  {isReady ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}
                  {isReady ? "Ready" : "Needs training"}
                </span>
              )}
              <button
                type="button"
                onClick={() => onToggleFavorite?.(model)}
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                aria-pressed={isFavorite}
                title={
                  isFavorite
                    ? "Favorite — preselected in the annotation page"
                    : "Set as your default model for its tasks"
                }
                className="p-0.5 rounded-md hover:bg-gray-100 transition-colors"
              >
                <Star
                  className={`w-4.5 h-4.5 ${
                    isFavorite
                      ? "fill-amber-400 text-amber-400"
                      : "text-gray-300 hover:text-amber-400"
                  }`}
                  style={{ width: 18, height: 18 }}
                />
              </button>
            </div>
          </div>
          {model.identifier && (
            <p
              className="text-[11px] text-gray-400 font-mono truncate mt-0.5"
              title={model.identifier}
            >
              {model.identifier}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-1 px-5 pb-5">
        {/* Capability chips: every task this model can serve */}
        {tasks.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tasks.map((taskKey) => {
              const meta = getTaskMeta(taskKey);
              return (
                <span
                  key={taskKey}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${meta.chip}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>
              );
            })}
          </div>
        )}

        {/* Highlight badges */}
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {badges.map((badge, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full text-[11px] font-medium"
              >
                <Sparkles className="w-3 h-3" />
                {badge}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {model.description && (
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 mb-3">
            {model.description}
          </p>
        )}

        {/* Usage tip */}
        {model.usageTip && (
          <div className="flex items-start gap-2 mb-3 p-2.5 bg-amber-50/70 rounded-lg">
            <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">{model.usageTip}</p>
          </div>
        )}

        {/* Descriptor chips: capabilities, prompts, tags, predicted label */}
        {(capabilities.length > 0 ||
          promptTypes.length > 0 ||
          tags.length > 0 ||
          model.labelId != null) && (
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            {capabilities.map((cap, index) => (
              <span
                key={`cap-${index}`}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cap.className}`}
              >
                {cap.Icon && <cap.Icon className="w-3 h-3" />}
                {cap.label}
              </span>
            ))}
            {promptTypes.map((pt, index) => (
              <span
                key={`pt-${index}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded-full text-[11px] font-medium capitalize"
                title="Supported prompt type"
              >
                <MousePointerClick className="w-3 h-3" />
                {String(pt).replace(/_/g, " ")}
              </span>
            ))}
            {tags.map((tag, index) => (
              <span
                key={`tag-${index}`}
                className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[11px]"
              >
                {tag.key && <span className="text-gray-400 mr-1">{tag.key}</span>}
                <span className="font-medium">{tag.value}</span>
              </span>
            ))}
            {model.labelId != null && (
              <span
                className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[11px] font-mono"
                title="Predicts this label id"
              >
                <Hash className="w-3 h-3 text-gray-400" />
                {model.labelId}
              </span>
            )}
          </div>
        )}

        {/* Footer: learn more + actions, pinned to bottom */}
        <div className="mt-auto flex items-center gap-2">
          {model.infoUrl && (
            <a
              href={model.infoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-teal-600 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Learn more
            </a>
          )}

          {showFinetuning && (
            <button
              onClick={() => handleAction("finetuning")}
              className="ml-auto inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-sm font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
              title="Fine-tune this model on a dataset"
            >
              <Wrench className="w-4 h-4" />
              Fine-tune
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelCard;
