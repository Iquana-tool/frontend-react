// Structured model metadata stays on the model for non-UI consumers, but it
// is not a user-facing descriptor tag.
const INTERNAL_MODEL_TAG_KEYS = new Set(["input_contracts"]);

const getTagKey = (tag) => (typeof tag === "string" ? tag : tag?.key);

export const isDisplayableModelTag = (tag) => {
  const key = String(getTagKey(tag) ?? "").trim().toLowerCase();
  return !INTERNAL_MODEL_TAG_KEYS.has(key);
};

export const filterDisplayableModelTags = (tags) =>
  (Array.isArray(tags) ? tags : []).filter(isDisplayableModelTag);
