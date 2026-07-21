import { Circle, Clock, Eye, CheckCircle2 } from 'lucide-react';

/**
 * The annotation statuses an image's mask can have, with the colors/icons used
 * to present them. Order matches the natural annotation lifecycle.
 *
 * Single source of truth for the gallery badge and the status filters.
 */
export const IMAGE_STATUSES = [
  {
    key: 'not_started',
    label: 'Not started',
    icon: Circle,
    dot: 'bg-gray-400',
    badge: 'bg-gray-100 text-gray-700',
    ring: 'ring-gray-300',
  },
  {
    key: 'in_progress',
    label: 'In progress',
    icon: Clock,
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-800',
    ring: 'ring-amber-300',
  },
  {
    key: 'reviewable',
    label: 'Reviewable',
    icon: Eye,
    dot: 'bg-purple-500',
    badge: 'bg-purple-100 text-purple-800',
    ring: 'ring-purple-300',
  },
  {
    key: 'finished',
    label: 'Finished',
    icon: CheckCircle2,
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-800',
    ring: 'ring-emerald-300',
  },
];

export const IMAGE_STATUS_MAP = Object.fromEntries(IMAGE_STATUSES.map((s) => [s.key, s]));

// Legacy/alias status values mapped onto canonical keys.
const STATUS_ALIASES = {
  completed: 'finished',
  done: 'finished',
  reviewed: 'finished',
};

/**
 * Resolve an image to its status descriptor, tolerating legacy shapes
 * (e.g. a bare `finished` flag or a "completed" status string).
 */
export const getImageStatus = (image) => {
  const raw = image?.status;
  if (raw && IMAGE_STATUS_MAP[raw]) return IMAGE_STATUS_MAP[raw];
  if (raw && STATUS_ALIASES[raw]) return IMAGE_STATUS_MAP[STATUS_ALIASES[raw]];
  if (image?.finished) return IMAGE_STATUS_MAP.finished;
  return IMAGE_STATUS_MAP.not_started;
};

/** Count images per status key. */
export const getImageStatusCounts = (images = []) => {
  const counts = { not_started: 0, in_progress: 0, reviewable: 0, finished: 0 };
  for (const image of images) {
    const key = getImageStatus(image).key;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
};
