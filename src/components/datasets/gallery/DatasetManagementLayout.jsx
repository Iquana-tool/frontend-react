import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDataset } from "../../../contexts/DatasetContext";
import DatasetGalleryHeader from "./DatasetGalleryHeader";
import SmallScreenMessage from "./SmallScreenMessage";
import LoadingState from "./LoadingState";
import ErrorState from "./ErrorState";
import * as api from "../../../api";
import {
  useGalleryLoadingData,
  useGalleryError,
  useGalleryActions
} from "../../../stores/selectors";
import { useDatasetGalleryData } from "../../../hooks/useDatasetGalleryData";

/**
 * Shared layout component for all dataset management pages.
 *
 * The dataset overview used to be a persistent left sidebar here. It carried the
 * dataset name (already in the header), its description, a Start Annotation
 * button and the label list — none of which are worth a fixed 25rem column on
 * every page, and the label list had a page of its own anyway. Navigation now
 * runs through the top bar (see `DatasetNav`), so the pages get the full width.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to display in the main area
 * @param {string|number} [props.datasetId] - Optional dataset ID (if not in URL params)
 * @param {string} [props.headerDensity="default"] - Header density ("default" | "compact")
 */
const DatasetManagementLayout = ({
  children,
  datasetId: propDatasetId,
  headerDensity = "default",
}) => {
  const { datasetId: paramDatasetId } = useParams();
  const navigate = useNavigate();
  const { loading } = useDataset();

  // Use prop datasetId if provided, otherwise use URL param
  const datasetId = propDatasetId || paramDatasetId;

  // Zustand store selectors
  const loadingData = useGalleryLoadingData();
  const error = useGalleryError();
  const galleryActions = useGalleryActions();

  // Use custom hook for data fetching and initialization
  const dataset = useDatasetGalleryData(datasetId, galleryActions);

  // Open the editor on the first image nobody has annotated yet.
  //
  // This asked for `not_started` on the *combined* status, which since the phase
  // split means "not calibrated, not annotated and not reviewed" — an image that
  // had only been calibrated no longer qualified. Annotating is what the button
  // does, so it asks the annotate phase. (It also read `image_ids`, which this
  // endpoint has never returned, so the lookup always fell through to the
  // dataset-level route.)
  const handleStartAnnotation = async () => {
    if (!dataset) return;

    try {
      const response = await api.fetchImagesWithAnnotationStatus(
        dataset.id, "not_started", "annotate"
      );
      const pending = response?.success ? response.image_data || [] : [];
      if (pending.length > 0) {
        navigate(`/dataset/${dataset.id}/annotate/${pending[0].image_id}`);
      } else {
        // Everything is annotated — go to the dataset-level editor route.
        navigate(`/dataset/${dataset.id}/annotate`);
      }
    } catch (error) {
      console.error("Error fetching unannotated images:", error);
      // Fallback to general annotation page
      navigate(`/dataset/${dataset.id}/annotate`);
    }
  };

  if (loading || loadingData) {
    return <LoadingState />;
  }

  if (error || !dataset) {
    return <ErrorState error={error} />;
  }

  return (
    <div className="min-h-screen bg-well">
      <SmallScreenMessage />

      {/* Large Screen Content - Show dataset management layout on screens 1024px and above */}
      <div className="hidden lg:flex lg:flex-col lg:h-screen">
        <DatasetGalleryHeader
          dataset={dataset}
          datasetName={dataset.name}
          onStartAnnotation={handleStartAnnotation}
          density={headerDensity}
        />

        {/* Main Content */}
        <div className="max-w-full mx-auto flex flex-1 min-h-0 w-full">
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatasetManagementLayout;
