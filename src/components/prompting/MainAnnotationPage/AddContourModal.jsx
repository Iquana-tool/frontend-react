import {Layers, Plus, Trash2} from "lucide-react";
import React, { useState, useEffect } from "react";
import { useDataset } from '../../../contexts/DatasetContext';
import * as api from '../../../api';


const AddContourModal = ({
    contours = [],
    selectedContours = [],
    isSegmenting,
    loading,
    handleAddSelectedContoursToFinalMask,
    handleDeleteSelectedContours,
    setError,
    setSelectedContours
}) => {
    const { currentDataset } = useDataset();
    const [availableLabels, setAvailableLabels] = useState([]);

    // Fetch available labels when component mounts or dataset changes
    useEffect(() => {
        const fetchLabels = async () => {
            if (!currentDataset) {
                setAvailableLabels([]);
                return;
            }

            try {
                const labels = await api.fetchLabels(currentDataset.id);
                setAvailableLabels(labels || []);
            } catch (err) {
                console.error("Error fetching labels:", err);
                setAvailableLabels([]);
            }
        };
        
        fetchLabels();
    }, [currentDataset]);
    // Helper to toggle selection
    const toggleContour = (idx) => {
        if (selectedContours.includes(idx)) {
            setSelectedContours(selectedContours.filter(i => i !== idx));
        } else {
            setSelectedContours([...selectedContours, idx]);
        }
    };
    // Helper to remove a contour from the list (discard)
    const discardContour = (idx) => {
        setSelectedContours(selectedContours.filter(i => i !== idx));
    };
    // Helper to select all
    const selectAll = () => {
        setSelectedContours(contours.map((_, i) => i));
    };
    // Helper to clear all
    const clearAll = () => {
        setSelectedContours([]);
    };
    
    // Helper to get contour label name
    const getContourLabelName = (contour, allContours, currentIndex) => {
        // Get the base label name by looking up in availableLabels
        let baseLabelName;
        if (contour.label_name) {
            baseLabelName = contour.label_name;
        } else if (contour.label && availableLabels.length > 0) {
            const labelInfo = availableLabels.find(label => label.id === contour.label);
            baseLabelName = labelInfo ? labelInfo.name : `Label ${contour.label}`;
        } else {
            baseLabelName = 'Unlabeled';
        }
        
        // Group contours by their base label name and count occurrences
        const contoursWithSameLabel = allContours.filter(c => {
            let cBaseLabelName;
            if (c.label_name) {
                cBaseLabelName = c.label_name;
            } else if (c.label && availableLabels.length > 0) {
                const labelInfo = availableLabels.find(label => label.id === c.label);
                cBaseLabelName = labelInfo ? labelInfo.name : `Label ${c.label}`;
            } else {
                cBaseLabelName = 'Unlabeled';
            }
            return cBaseLabelName === baseLabelName;
        });
        
        // If there's only one contour with this label, don't add a number
        if (contoursWithSameLabel.length === 1) {
            return baseLabelName;
        }
        
        // Find the position of current contour within contours of the same type
        // For AddContourModal, contours might not have IDs, so use array index as fallback
        let indexInGroup;
        if (contour.id) {
            indexInGroup = contoursWithSameLabel.findIndex(c => c.id === contour.id) + 1;
        } else {
            // Fallback: use the position in the current filtered array
            indexInGroup = contoursWithSameLabel.indexOf(contour) + 1;
            if (indexInGroup === 0) {
                // If indexOf fails, use currentIndex + 1 as last resort
                indexInGroup = (currentIndex % contoursWithSameLabel.length) + 1;
            }
        }
        
        return `${baseLabelName} ${indexInGroup}`;
    };
    return (
        <div className="absolute top-2 sm:top-4 right-2 sm:right-4 bg-white/95 backdrop-blur-sm p-3 sm:p-4 rounded-lg shadow-lg z-10 border border-teal-200 min-w-[260px] max-w-xs">
            <div className="flex flex-col gap-2 sm:gap-3">
                <div className="text-xs sm:text-sm font-semibold text-teal-800 flex items-center gap-1.5 border-b border-teal-100 pb-2">
                    <Layers className="h-4 w-4 text-teal-600" />
                    Segmentation Results
                </div>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-700">Contours</span>
                    <div className="flex gap-1">
                        <button onClick={selectAll} className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 hover:bg-green-200">All</button>
                        <button onClick={clearAll} className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700 hover:bg-gray-300">Clear</button>
                    </div>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                    {contours.length === 0 ? (
                        <div className="text-xs text-gray-500 italic">No contours found.</div>
                    ) : (
                        contours.map((contour, idx) => (
                            <div key={idx} className={`flex items-center justify-between p-2 rounded-md border ${selectedContours.includes(idx) ? 'border-teal-400 bg-teal-50' : 'border-gray-200 bg-white'}`}>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" checked={selectedContours.includes(idx)} onChange={() => toggleContour(idx)} />
                                    <span className="text-xs text-gray-700">{getContourLabelName(contour, contours, idx)}</span>
                                </div>
                                <button onClick={() => discardContour(idx)} className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors" title="Discard contour">
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-2 pt-2 border-t border-gray-100">
                    <button
                        onClick={() => {
                            if (selectedContours.length > 0) {
                                handleAddSelectedContoursToFinalMask();
                            } else {
                                setError("No contours selected - please select contours first");
                            }
                        }}
                        disabled={selectedContours.length === 0 || loading}
                        className={`px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm flex-1 flex items-center justify-center transition-colors ${selectedContours.length === 0 || loading ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-teal-600 hover:bg-teal-700 text-white"}`}
                    >
                        <Plus className="w-3 h-3 mr-1 sm:mr-1.5" />
                        Add to Final
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AddContourModal;