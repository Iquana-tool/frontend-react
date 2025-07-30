import React, { useState, useEffect, useRef} from "react";
import { useNavigate, useParams } from "react-router-dom";
import {fetchImagesWithAnnotationStatus} from "../../../api/images";
import {useDataset} from "../../../contexts/DatasetContext";
import { ArrowRight, Loader2, Home } from "lucide-react";


const NextButton = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [showCompletionMessage, setShowCompletionMessage] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    
    const navigate = useNavigate();
    const { imageId } = useParams();
    const prevImageIdRef = useRef(imageId);
    
    const datasetsContext = useDataset();
    const {
        currentDataset,
        setError
    } = datasetsContext;

    // Reset completion message when imageId changes (user navigated to different image)
    useEffect(() => {
        if (prevImageIdRef.current !== imageId) {
            setShowCompletionMessage(false);
        }
        prevImageIdRef.current = imageId;
    }, [imageId]);

    const handleClick = async () => {
        // If showing completion message, navigate back to datasets
        if (showCompletionMessage) {
            navigate('/datasets');
            return;
        }

        setIsLoading(true);
        try {
            // Fetch the list of unannotated images
            const response = await fetchImagesWithAnnotationStatus(currentDataset.id, "missing");
            
            // Get the unannotated images from the response
            const unannotatedImages = response.images;

            if (unannotatedImages && unannotatedImages.length > 0) {
                // Convert current imageId to number for comparison
                const currentImageId = parseInt(imageId);

                // Find the current image's position in the unannotated images list
                const currentIndex = unannotatedImages.findIndex(id => parseInt(id) === currentImageId);

                if (currentIndex === -1) {
                    // Current image is not in unannotated list, go to first unannotated image
                    const nextImageId = unannotatedImages[0];
                    const navigationUrl = `/dataset/${currentDataset.id}/annotate/${nextImageId}`;
                    navigate(navigationUrl);
                } else if (currentIndex < unannotatedImages.length - 1) {
                    // There's a next image in the list
                    const nextImageId = unannotatedImages[currentIndex + 1];
                    const navigationUrl = `/dataset/${currentDataset.id}/annotate/${nextImageId}`;
                    navigate(navigationUrl);
                } else {
                    // We're at the last unannotated image
                    // Use setTimeout to ensure state update is processed
                    setTimeout(() => {
                        setShowCompletionMessage(true);
                    }, 100);
                }
            } else {
                // Use setTimeout to ensure state update is processed
                setTimeout(() => {
                    setShowCompletionMessage(true);
                }, 100);
            }
        } catch (err) {
            console.error("Error fetching next image:", err);
            setError(err.message || "Failed to fetch next image");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative group">
            <button
                onClick={handleClick}
                disabled={isLoading}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className={`
                    flex items-center gap-2 justify-center px-4 py-2 rounded-xl text-white font-semibold
                    transition-all duration-300 ease-in-out transform hover:scale-[1.02] active:scale-[0.98]
                    shadow-lg hover:shadow-xl backdrop-blur-sm border border-white/20
                    ${
                        isLoading
                            ? "bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed shadow-none scale-100"
                            : showCompletionMessage
                            ? "bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 shadow-blue-500/25 hover:shadow-blue-500/40"
                            : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-indigo-500/25 hover:shadow-indigo-500/40"
                    }
                    min-w-[50px] 2xl:min-w-[100px] relative overflow-hidden
                    before:absolute before:inset-0 before:bg-white/10 before:translate-x-[-100%] 
                    hover:before:translate-x-[100%] before:transition-transform before:duration-700 before:ease-out
                `}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="animate-pulse hidden 2xl:inline">Loading...</span>
                    </>
                ) : showCompletionMessage ? (
                    <>
                        <Home className="h-4 w-4" />
                        <span className="hidden 2xl:inline">Back to Datasets</span>
                    </>
                ) : (
                    <>
                        <span className="hidden 2xl:inline">Next</span>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </>
                )}

                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent
                             opacity-0 group-hover:opacity-100 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%]
                             transition-all duration-700 ease-out"></div>
            </button>

            {/* Hover tooltip */}
            {showTooltip && !showCompletionMessage && (
                <div className="absolute bottom-[60px] right-0 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg z-50 whitespace-nowrap">
                    <span className="text-xs">Navigate to the next unannotated image</span>
                    {/* Arrow pointing down */}
                    <div className="absolute top-full right-6 w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-gray-800"></div>
                </div>
            )}

            {/* Completion tooltip */}
            {showTooltip && showCompletionMessage && (
                <div className="absolute bottom-[60px] right-0 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg z-50 whitespace-nowrap">
                    <span className="text-xs">All images annotated! Return to dataset overview</span>
                    {/* Arrow pointing down */}
                    <div className="absolute top-full right-6 w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-gray-800"></div>
                </div>
            )}
        </div>
    );
}

export default NextButton;