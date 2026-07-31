import { useMemo } from 'react';
import {
  useAvailablePromptedModels,
  usePromptedModel,
  useAiAssist,
} from '../../../stores/selectors/annotationSelectors';

/** Canonical singular keys, so "points"/"Point" both normalise to "point". */
const normalise = (type) =>
  String(type || '')
    .trim()
    .toLowerCase()
    .replace(/s$/, '');

/**
 * Which shape tools the active prompted model accepts.
 *
 * This gating used to live in the in-canvas PromptModeToolbar, which the
 * redesign removes. It now applies to the rail instead — but only while AI
 * assist is on: with assist off a shape is committed as drawn and no model is
 * involved, so every shape stays available.
 *
 * Point and box are always offered, and a model that declares no prompt types
 * at all is treated as supporting everything rather than being unusable.
 */
export default function useSupportedPromptTypes() {
  const models = useAvailablePromptedModels();
  const promptedModel = usePromptedModel();
  const aiAssist = useAiAssist();

  return useMemo(() => {
    if (!aiAssist) return null; // null means "no restriction"

    const model = models.find((candidate) => candidate.id === promptedModel);
    const declared = model?.supported_prompt_types;
    if (!Array.isArray(declared) || declared.length === 0) return null;

    const supported = new Set(declared.map(normalise));
    return {
      point: true,
      box: true,
      polygon: supported.has('polygon'),
      freehand: supported.has('polygon'),
      modelName: model?.name || promptedModel,
    };
  }, [models, promptedModel, aiAssist]);
}
