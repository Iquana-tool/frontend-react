import { useState } from 'react';

export const useAnnotationState = () => {
  // UI State
  const [promptType, setPromptType] = useState("point");
  const [currentLabel, setCurrentLabel] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showSaveMaskDialog, setShowSaveMaskDialog] = useState(false);
  const [savingMaskIndex, setSavingMaskIndex] = useState(null);
  const [saveMaskLabel, setSaveMaskLabel] = useState("coral");
  const [customSaveMaskLabel, setCustomSaveMaskLabel] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [labelOptions, setLabelOptions] = useState({});

  // Instant Segmentation State
  const [instantSegmentationState, setInstantSegmentationState] = useState({
    isInstantSegmentationEnabled: false,
    isInstantSegmenting: false,
    shouldSuppressLoadingModal: false
  });

  return {
    // UI State
    promptType,
    setPromptType,
    currentLabel,
    setCurrentLabel,
    viewMode,
    setViewMode,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    successMessage,
    setSuccessMessage,
    showSaveMaskDialog,
    setShowSaveMaskDialog,
    savingMaskIndex,
    setSavingMaskIndex,
    saveMaskLabel,
    setSaveMaskLabel,
    customSaveMaskLabel,
    setCustomSaveMaskLabel,
    isTransitioning,
    setIsTransitioning,
    labelOptions,
    setLabelOptions,
    
    // Instant Segmentation State
    instantSegmentationState,
    setInstantSegmentationState,
  };
}; 