import { useCallback, useEffect, useMemo, useState } from 'react';
import * as api from '../api';
import { facetsFromImages, typesByKeyFromFacets } from '../utils/imageMetadata';

/**
 * The dataset's metadata vocabulary — which keys exist, what type each one is,
 * which values they take and how many images are untagged.
 *
 * Fetched rather than derived from the images, because a key's *type* lives on
 * the server and cannot be recovered from its values: "12" is a number, a
 * category or a note depending on what someone declared. The client-side
 * derivation is kept as a fallback for the moment before the fetch lands (and
 * for when it fails), where treating every key as categorical is exactly the
 * behaviour keys have before anyone declares one.
 *
 * Refetches whenever the image list is replaced, which is what happens after any
 * metadata edit — so the chips follow a save without an explicit invalidation.
 *
 * @param {number|string|null} datasetId
 * @param {Array} images - The gallery's normalized images, for the fallback and
 *   as the refetch trigger.
 */
export const useDatasetMetadata = (datasetId, images) => {
    const [facets, setFacets] = useState(null);
    const [untaggedCount, setUntaggedCount] = useState(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        if (!datasetId) return;
        setLoading(true);
        try {
            const response = await api.fetchDatasetMetadata(datasetId);
            setFacets(response.facets || []);
            setUntaggedCount(response.untagged_count ?? null);
        } catch (error) {
            // Non-fatal: the fallback below still gives a working filter row.
            console.error('Could not load dataset metadata:', error);
            setFacets(null);
        } finally {
            setLoading(false);
        }
    }, [datasetId]);

    useEffect(() => {
        load();
    }, [load, images]);

    const derivedFacets = useMemo(() => facetsFromImages(images), [images]);
    const effectiveFacets = facets ?? derivedFacets;

    const typesByKey = useMemo(
        () => typesByKeyFromFacets(effectiveFacets),
        [effectiveFacets]
    );

    const derivedUntagged = useMemo(
        () => (images || []).filter(
            (image) => Object.keys(image?.metadata || {}).length === 0
        ).length,
        [images]
    );

    return {
        facets: effectiveFacets,
        typesByKey,
        untaggedCount: untaggedCount ?? derivedUntagged,
        loading,
        refresh: load,
    };
};

export default useDatasetMetadata;
