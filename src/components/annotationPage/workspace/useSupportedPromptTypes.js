import { useMemo } from 'react';
import {
  useAvailablePromptedModels,
  usePromptedModel,
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
 * This is a fact about the model, so it is reported unconditionally and each
 * caller decides what to do with it. The action bar disables "Run AI" over a
 * prompt the model cannot take; the rail only greys the tool out when placing
 * the shape *is* running the model, because otherwise the shape may well be
 * headed for "Add this object" instead. Greying it out regardless is what made
 * a point/box-only model look as though it had removed manual adding.
 *
 * Point and box are always offered, and a model that declares no prompt types
 * at all is treated as supporting everything rather than being unusable.
 */
export default function useSupportedPromptTypes() {
  const models = useAvailablePromptedModels();
  const promptedModel = usePromptedModel();

  return useMemo(() => {
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
  }, [models, promptedModel]);
}
