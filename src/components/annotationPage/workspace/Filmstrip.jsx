import React from 'react';
import { ChevronDown } from 'lucide-react';
import useWorkspaceImageNav from './useWorkspaceImageNav';
import ImageFilmstrip from '../../ui/ImageFilmstrip';
import { getImageStatus } from '../../../utils/imageStatus';
import { useToggleFilmstrip } from '../../../stores/selectors/annotationSelectors';

/**
 * Bottom image navigator.
 *
 * The strip itself — the tiles, their status marks and the lazy thumbnail loading — moved
 * to `ui/ImageFilmstrip` so the per-image quantification page can show the same navigator.
 * What stays here is what only makes sense inside an annotation session: the list and the
 * selection come from the workspace store, and the collapse control belongs to this
 * layout's chrome.
 */
const Filmstrip = () => {
  const { imageList, currentIndex, goToImage } = useWorkspaceImageNav();
  const toggleFilmstrip = useToggleFilmstrip();

  const finishedCount = imageList.filter(
    (image) => getImageStatus(image).key === 'finished'
  ).length;

  return (
    <div className="h-[74px] flex-none flex items-center gap-[7px] px-[10px] bg-p1 border-t border-ln">
      <button
        type="button"
        onClick={toggleFilmstrip}
        aria-label="Hide navigator"
        title="Hide navigator"
        className="w-[22px] h-[44px] flex-none flex items-center justify-center rounded-6 bg-well text-t3 hover:text-ac transition-colors duration-150"
      >
        <ChevronDown size={14} />
      </button>

      <ImageFilmstrip
        images={imageList}
        selectedId={imageList[currentIndex]?.id ?? null}
        onSelect={goToImage}
        className="flex-1 min-w-0"
      />

      <span className="flex-none font-mono text-meta text-t3 tabular-nums">
        {imageList.length} images · {finishedCount} finished
      </span>
    </div>
  );
};

export default Filmstrip;
