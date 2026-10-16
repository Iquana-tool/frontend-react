import React, { useMemo } from 'react';
import {
  useCloseSceneGraphPopover,
  useObjectsList,
  useSceneGraphPopover,
} from '../../../stores/selectors/annotationSelectors';
import RelationshipPopover from './RelationshipPopover';
import AttributePopover from './AttributePopover';

/**
 * Mounts whichever relate/describe popover the object menu opened, next to the menu in
 * the canvas container. The popover's objects are resolved here, in selection order,
 * and it closes itself if they disappear (deleted, image switched).
 */
const SceneGraphPopover = () => {
  const popover = useSceneGraphPopover();
  const close = useCloseSceneGraphPopover();
  const list = useObjectsList();

  const objects = useMemo(() => {
    if (!popover) return [];
    return popover.objectIds.map((id) => list.find((object) => object.id === id)).filter(Boolean);
  }, [popover, list]);

  if (!popover || !objects.length) return null;
  // Keyed so reopening for another selection starts from a clean form.
  const key = `${popover.kind}-${popover.objectIds.join('-')}`;
  if (popover.kind === 'relationship') {
    if (objects.length < 2) return null;
    return <RelationshipPopover key={key} popover={popover} objects={objects} onClose={close} />;
  }
  return <AttributePopover key={key} popover={popover} objects={objects} onClose={close} />;
};

export default SceneGraphPopover;
