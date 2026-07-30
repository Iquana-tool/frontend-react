import React from "react";
import {
  CheckCircle2,
  AlertCircle,
  MousePointerClick,
  Wand2,
  Boxes,
  Scan,
  Star,
  Cpu,
  Timer,
} from "lucide-react";
import { TASK_ORDER } from "../../constants/tasks";
import { formatParams, formatLatency } from "./modelStats";

// Keep in sync with ModelCard's visual map: the primary task drives the tile
// gradient + icon so a model looks the same in the list and the detail panel.
const TASK_VISUAL = {
  "prompted-segmentation": { Icon: MousePointerClick, tile: "from-sky-500 to-blue-500" },
  "instance-suggestion": { Icon: Wand2, tile: "from-violet-500 to-purple-500" },
  "instance-segmentation": { Icon: Boxes, tile: "from-amber-500 to-orange-500" },
};
const DEFAULT_VISUAL = { Icon: Scan, tile: "from-teal-500 to-cyan-500" };

const orderTasks = (tasks) =>
  [...(tasks || [])].sort((a, b) => TASK_ORDER.indexOf(a) - TASK_ORDER.indexOf(b));

/**
 * Compact, selectable preview of a model for the zoo's left list. Shows just
 * what you scan by — name, primary-task icon, status, favorite, and up to two
 * headline stats — and defers the full spec sheet to the detail panel.
 */
const ModelChip = ({ model, isSelected = false, isFavorite = false, onSelect, onToggleFavorite }) => {
  const primaryTask = orderTasks(model.tasks)[0];
  const { Icon, tile } = TASK_VISUAL[primaryTask] || DEFAULT_VISUAL;
  const isReady = model.status !== "not_ready";

  const params = formatParams(model.performance?.num_parameters);
  const latency = formatLatency(model.performance?.latency_ms);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(model)}
      aria-pressed={isSelected}
      className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all ${
        isSelected
          ? "bg-teal-50 border-teal-300 ring-1 ring-teal-300"
          : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      <div
        className={`shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br ${tile} flex items-center justify-center shadow-sm`}
      >
        <Icon className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-gray-900 truncate flex-1" title={model.name}>
            {model.name}
          </h3>
          <span
            className="shrink-0 p-0.5 rounded-md hover:bg-white"
            role="button"
            tabIndex={0}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={isFavorite}
            title={isFavorite ? "Favorite — preselected in the annotation page" : "Set as default"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.(model);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite?.(model);
              }
            }}
          >
            <Star
              className={
                isFavorite ? "fill-amber-400 text-amber-400" : "text-gray-300 hover:text-amber-400"
              }
              style={{ width: 15, height: 15 }}
            />
          </span>
        </div>

        <div className="mt-1 flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500">
          <span
            className={`inline-flex items-center gap-1 font-medium ${
              isReady ? "text-green-600" : "text-amber-600"
            }`}
          >
            {isReady ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {isReady ? "Ready" : "Needs training"}
          </span>
          {params && (
            <span className="inline-flex items-center gap-1" title="Parameters">
              <Cpu className="w-3 h-3 text-gray-400" />
              {params}
            </span>
          )}
          {latency && (
            <span className="inline-flex items-center gap-1" title="Approx. inference time">
              <Timer className="w-3 h-3 text-gray-400" />
              {latency}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export default ModelChip;
