import React, {useState, useEffect} from "react";
import {markMaskAsFinal, getMaskAnnotationStatus, markMaskAsUnfinished} from "../../../api/masks";
import {
    CheckCircle,
    Pencil,
    Loader2,
} from "lucide-react";

const FinishButton = ({
    maskId, // Assuming mask is passed as a prop
                      }) => {
    const [finished, setFinished] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
        if (maskId === undefined) {
            console.warn("No mask ID provided, skipping status check.");
            return;
        }
        // Check if the mask is already marked as final
        const checkMaskStatus = async () => {
            try {
                const response = await getMaskAnnotationStatus(maskId);
                console.log("Mask status response:", response.status);
                setFinished(response.status === "finished"); // Assuming response contains a boolean isFinal
            } catch (error) {
                console.error("Error checking mask status:", error);
            }
        };
        checkMaskStatus();
        setIsLoading(false);
    }, [maskId]);

    const onClick = async () => {
        setIsLoading(true);
        // Simulate an async operation, e.g., saving data
        if (!finished){
            console.log("Finish button triggered with unfinished mask. Marking mask with ID ", maskId, " as final.");
            await markMaskAsFinal(maskId)
                .then(() => {
                    // Handle success, e.g., show a success message or redirect
                    console.log("Mask marked as final successfully");
                })
                .catch((error) => {
                    // Handle error, e.g., show an error message
                    console.error("Error marking mask as final:", error);
                    console.log("Mask id:", maskId);
                })
                .finally(() => {
                    setIsLoading(false);
                });
            setFinished(true);
        } else {
            console.log("Finish button triggered with finished mask with id ", maskId, ". Marking mask as unfinished.");
            await markMaskAsUnfinished(maskId)
            .then(() => {
                    // Handle success, e.g., show a success message or redirect
                    console.log("Mask marked as unfinished successfully");
                })
            .catch((error) => {
                // Handle error, e.g., show an error message
                console.error("Error marking mask as unfinished:", error);
                console.log("Mask id:", maskId);
            })
            .finally(() => {
                setIsLoading(false);
            });
            setFinished(false);
        }

    };

    return (
        <div className="relative">
            <button
                onClick={onClick}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className={`
                group flex items-center gap-2 justify-center px-4 py-2 rounded-xl text-white font-semibold
                transition-all duration-300 ease-in-out transform hover:scale-[1.02] active:scale-[0.98]
                shadow-lg hover:shadow-xl backdrop-blur-sm border border-white/20
                ${
                    isLoading
                        ? "bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed shadow-none scale-100"
                        : (!finished
                            ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-emerald-500/25 hover:shadow-emerald-500/40"
                            : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/25 hover:shadow-amber-500/40"
                        )
                }
                min-w-[120px] relative overflow-hidden
                before:absolute before:inset-0 before:bg-white/10 before:translate-x-[-100%] 
                hover:before:translate-x-[100%] before:transition-transform before:duration-700 before:ease-out
            `}
            disabled={isLoading}
        >
            {isLoading ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="animate-pulse">Processing...</span>
                </>
            ) : finished ? (
                <>
                    <Pencil className="h-4 w-4 group-hover:rotate-12 transition-transform duration-300" />
                    <span>Edit Mask</span>
                </>
            ) : (
                <>
                    <CheckCircle className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                    <span>Finish Mask</span>
                </>
            )}
            
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                         opacity-0 group-hover:opacity-100 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] 
                         transition-all duration-700 ease-out"></div>
            </button>

            {/* Hover tooltip */}
            {showTooltip && (
                <div className="absolute bottom-[60px] left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg z-50 whitespace-nowrap">
                    <span className="text-xs">
                        {finished ? "Mark mask as incomplete to continue editing" : "Mark this mask as complete"}
                    </span>
                    {/* Arrow pointing down */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-gray-800"></div>
                </div>
            )}
        </div>
    );
};

export default FinishButton;