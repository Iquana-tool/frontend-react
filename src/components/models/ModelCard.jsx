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
  Layers,
  Boxes,
  Wand2,
  Scan,
} from "lucide-react";

// Per-service visual accent + icon. Keeps cards scannable without repeating the
// service name inside every card (the section header already states it).
const SERVICE_ACCENTS = {
  "Prompted Segmentation": { Icon: MousePointerClick, tile: "from-sky-500 to-blue-500" },
  "Suggestion Segmentation": { Icon: Wand2, tile: "from-violet-500 to-purple-500" },
  "Instance Segmentation": { Icon: Boxes, tile: "from-amber-500 to-orange-500" },
  "Semantic Segmentation": { Icon: Layers, tile: "from-teal-500 to-cyan-500" },
};

const DEFAULT_ACCENT = { Icon: Scan, tile: "from-teal-500 to-cyan-500" };

const ModelCard = ({ model, onAction }) => {
  const handleAction = (actionType) => onAction?.(model, actionType);

  const showTraining = model.trainable === true;
  const showFinetuning = model.finetunable === true;

  const badges = Array.isArray(model.badges) ? model.badges : [];
  const promptTypes = Array.isArray(model.promptTypesSupported) ? model.promptTypesSupported : [];
  const isReady = model.status !== "not_ready";
  const { Icon, tile } = SERVICE_ACCENTS[model.service] || DEFAULT_ACCENT;

  // Drop the "task" tag — it just restates the service the card is grouped under.
  const tags = (Array.isArray(model.tags) ? model.tags : []).filter(
    (t) => String(t.key || "").toLowerCase() !== "task"
  );

  // A single, de-duplicated row of descriptor chips. Trainable / Fine-tunable are
  // intentionally omitted here because the action buttons already convey them.
  const capabilities = [
    model.pretrained && { label: "Pretrained", className: "bg-green-50 text-green-700" },
    model.refinementSupported && {
      label: "Refinement",
      className: "bg-teal-50 text-teal-700",
      Icon: RefreshCw,
    },
    !showTraining && !showFinetuning && {
      label: "Inference only",
      className: "bg-gray-100 text-gray-600",
    },
  ].filter(Boolean);

  return (
    <div className="group flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-gray-300 hover:-translate-y-0.5 transition-all duration-200">
      {/* Header: icon + name + status */}
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
            {model.status && (
              <span
                className={`inline-flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
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

        {/* Unified descriptor chips: capabilities, prompts, tags, predicted label */}
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

          {(showTraining || showFinetuning) && (
            <div className="ml-auto flex items-center gap-2">
              {showTraining && (
                <button
                  onClick={() => handleAction("training")}
                  className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  title="Train model"
                >
                  <GraduationCap className="w-4 h-4" />
                  Train
                </button>
              )}
              {showFinetuning && (
                <button
                  onClick={() => handleAction("finetuning")}
                  className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-sm font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                  title="Fine-tune model"
                >
                  <Wrench className="w-4 h-4" />
                  Fine-tune
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelCard;
