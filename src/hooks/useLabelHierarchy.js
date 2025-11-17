import { useState, useCallback } from 'react';
import { hasChildren } from '../utils/labelHierarchy';

/**
 * Custom hook for managing label hierarchy state
 * Provides common functionality for expand/collapse and hierarchy manipulation
 */
export const useLabelHierarchy = (initialLabels = []) => {
  const [labelHierarchy, setLabelHierarchy] = useState(initialLabels);
  const [expandedLabels, setExpandedLabels] = useState(new Set());

  // Toggle expanded state for a label
  const toggleExpanded = useCallback((labelId) => {
    setExpandedLabels((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(labelId)) {
        newExpanded.delete(labelId);
      } else {
        newExpanded.add(labelId);
      }
      return newExpanded;
    });
  }, []);

  // Expand a label
  const expandLabel = useCallback((labelId) => {
    setExpandedLabels((prev) => new Set([...prev, labelId]));
  }, []);

  // Collapse a label
  const collapseLabel = useCallback((labelId) => {
    setExpandedLabels((prev) => {
      const newExpanded = new Set(prev);
      newExpanded.delete(labelId);
      return newExpanded;
    });
  }, []);

  // Expand all labels
  const expandAll = useCallback(() => {
    const getAllLabelIds = (labels) => {
      const ids = [];
      labels.forEach((label) => {
        ids.push(label.id);
        if (hasChildren(label)) {
          ids.push(...getAllLabelIds(label.children));
        }
      });
      return ids;
    };
    setExpandedLabels(new Set(getAllLabelIds(labelHierarchy)));
  }, [labelHierarchy]);

  // Collapse all labels
  const collapseAll = useCallback(() => {
    setExpandedLabels(new Set());
  }, []);

  // Update label hierarchy
  const updateHierarchy = useCallback((updater) => {
    setLabelHierarchy(updater);
  }, []);

  return {
    labelHierarchy,
    expandedLabels,
    setLabelHierarchy,
    toggleExpanded,
    expandLabel,
    collapseLabel,
    expandAll,
    collapseAll,
    updateHierarchy,
  };
};

