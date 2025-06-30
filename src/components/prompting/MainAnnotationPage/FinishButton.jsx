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
    console.log("FinishButton component rendered with maskId:", maskId);
    const [finished, setFinished] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (maskId === undefined) {
            console.warn("No mask ID provided, skipping status check.");
            return;
        } else {
            console.log("Checking mask status for ID:", maskId);
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
        <button
            onClick={onClick}
            className={`flex items-center gap-2 justify-center px-4 py-2 rounded-md text-white transition-colors ${
                isLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : (!finished
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-blue-600 hover:bg-blue-700"
                    )
                    }
            }`}
            disabled={isLoading}
        >
            {isLoading ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading...</span>
                </>
            ) : finished ? (
                <>
                    <Pencil className="h-4 w-4" />
                    <span>Edit Mask</span>
                </>
            ) : (
                <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Finish Mask</span>
                </>
            )}
        </button>
    );
};

export default FinishButton;