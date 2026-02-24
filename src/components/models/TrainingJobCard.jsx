import React from "react";
import {
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  StopCircle,
} from "lucide-react";

/** Map Celery/backend status to display label */
export const TRAINING_STATUS = {
  PENDING: "Queued",
  STARTED: "Training in progress",
  SUCCESS: "Finished",
  FAILURE: "Failed",
  REVOKED: "Cancelled",
};

/** Human-readable status from backend result.status */
const getDisplayStatus = (status) => {
  if (!status) return "Unknown";
  const s = String(status).toUpperCase();
  return TRAINING_STATUS[s] || status;
};

/**
 * Card for a single training run: shows model name, dataset, status, progress, and cancel.
 */
const TrainingJobCard = ({
  job,
  onCancel,
  progressMessage,
}) => {
  const { task_id, model_name, model_key, dataset_id, status, progress, error } = job;
  const isActive = status === "PENDING" || status === "STARTED";
  const isFinished = status === "SUCCESS";
  const isFailed = status === "FAILURE" || status === "REVOKED";

  const statusConfig = {
    PENDING: {
      icon: Clock,
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-800",
      iconClass: "text-amber-600",
    },
    STARTED: {
      icon: Loader2,
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-800",
      iconClass: "text-blue-600 animate-spin",
    },
    SUCCESS: {
      icon: CheckCircle2,
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-800",
      iconClass: "text-green-600",
    },
    FAILURE: {
      icon: XCircle,
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
      iconClass: "text-red-600",
    },
    REVOKED: {
      icon: StopCircle,
      bg: "bg-gray-100",
      border: "border-gray-200",
      text: "text-gray-700",
      iconClass: "text-gray-500",
    },
  };

  const normalizedStatus = String(status || "PENDING").toUpperCase();
  const config = statusConfig[normalizedStatus] || statusConfig.PENDING;
  const Icon = config.icon;

  return (
    <div
      className={`rounded-xl border-2 ${config.border} ${config.bg} p-4 transition-shadow hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-gray-900 truncate">{model_name || model_key || "Model"}</h4>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} border ${config.border}`}
            >
              <Icon className={`w-3.5 h-3.5 ${config.iconClass}`} />
              {getDisplayStatus(status)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
            <span>Dataset ID: {dataset_id}</span>
            <span className="font-mono text-xs text-gray-500">Task: {task_id?.slice(0, 8)}…</span>
          </div>
          {progressMessage && (
            <p className="mt-2 text-sm text-gray-700">{progressMessage}</p>
          )}
          {error && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </p>
          )}
          {progress && typeof progress === "object" && (progress.epoch_count != null || progress.current_epoch != null || progress.epoch != null) && (
            <p className="mt-1 text-xs text-gray-500">
              Epoch {progress.current_epoch ?? progress.epoch_count ?? progress.epoch ?? "—"}
              {(progress.total_epochs ?? progress.num_epochs) != null && ` / ${progress.total_epochs ?? progress.num_epochs}`}
            </p>
          )}
        </div>
        {isActive && onCancel && (
          <button
            type="button"
            onClick={() => onCancel(task_id)}
            className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default TrainingJobCard;
