import {Layers, Plus, RotateCcw, Trash2} from "lucide-react";
import React from "react";


const AddContourModal = ({
    selectedContours,
    isSegmenting,
    loading,
    handleAddSelectedContoursToFinalMask,
    handleDeleteSelectedContours,
    setError,
    setSelectedContours
                         }) => {
    return (
        <div className="absolute top-2 sm:top-4 right-2 sm:right-4 bg-white/95 backdrop-blur-sm p-3 sm:p-4 rounded-lg shadow-lg z-10 border border-teal-200 w-[180px] sm:min-w-[200px]">
                  <div className="flex flex-col gap-2 sm:gap-3">
                    <div className="text-xs sm:text-sm font-semibold text-teal-800 flex items-center gap-1.5 border-b border-teal-100 pb-2">
                      <Layers className="h-4 w-4 text-teal-600" />
                      Segmentation Results
                    </div>
                    {!isSegmenting && (
                      <>
                        <div className="flex flex-col sm:space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs sm:text-sm text-gray-700">
                              Contours selected:
                            </span>
                            <span className="px-1.5 sm:px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs sm:text-sm font-medium">
                              {selectedContours.length}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-1 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => {
                              console.log(
                                "Panel Add to Final Mask button clicked - selectedContours:",
                                selectedContours
                              );
                              if (selectedContours.length > 0) {
                                handleAddSelectedContoursToFinalMask();
                              } else {
                                setError(
                                  "No contours selected - please select contours first"
                                );
                              }
                            }}
                            disabled={
                              selectedContours.length === 0 || loading
                            }
                            className={`px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm flex-1 flex items-center justify-center transition-colors ${
                              selectedContours.length === 0 || loading
                                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                : "bg-teal-600 hover:bg-teal-700 text-white"
                            }`}
                          >
                            <Plus className="w-3 h-3 mr-1 sm:mr-1.5" />
                            Add to Final
                          </button>
                        </div>

                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                          <button
                            onClick={handleDeleteSelectedContours}
                            disabled={
                              selectedContours.length === 0 || loading
                            }
                            className={`px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm flex-1 flex items-center justify-center transition-colors ${
                              selectedContours.length === 0 || loading
                                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                : "bg-red-600 hover:bg-red-700 text-white"
                            }`}
                          >
                            <Trash2 className="w-3 h-3 mr-1 sm:mr-1.5" />
                            Delete
                          </button>

                          <button
                            onClick={() => setSelectedContours([])}
                            disabled={
                              selectedContours.length === 0 || loading
                            }
                            className={`px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm flex-1 flex items-center justify-center transition-colors ${
                              selectedContours.length === 0 || loading
                                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                : "bg-gray-600 hover:bg-gray-700 text-white"
                            }`}
                          >
                            <RotateCcw className="w-3 h-3 mr-1 sm:mr-1.5" />
                            Reset
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
    )
}

export default AddContourModal;