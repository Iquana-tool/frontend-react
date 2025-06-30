import React, {useState, useEffect} from "react";
import {markMaskAsFinal, getMaskAnnotationStatus} from "../../../api/masks";

const FinishButton = ({
    mask_id, // Assuming mask is passed as a prop
                      }) => {
    const [finished, setFinished] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Check if the mask is already marked as final
        const checkMaskStatus = async () => {
            if (mask_id === undefined) {
                console.warn("No mask ID provided, skipping status check.");
                return;
            }
            try {
                const response = await getMaskAnnotationStatus(mask_id);
                console.log("Mask status response:", response.status);
                setFinished(response.status === "finished"); // Assuming response contains a boolean isFinal
            } catch (error) {
                console.error("Error checking mask status:", error);
            }
        };
        checkMaskStatus();
        setIsLoading(false);
    }, [mask_id]);

    const onClick = async () => {
        if (mask_id === undefined){return}
        setIsLoading(true);
        // Simulate an async operation, e.g., saving data
        await markMaskAsFinal(mask_id)
            .then(() => {
                // Handle success, e.g., show a success message or redirect
                console.log("Mask marked as final successfully");
            })
            .catch((error) => {
                // Handle error, e.g., show an error message
                console.error("Error marking mask as final:", error);
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    return (
        <button
        onClick={onClick}
        className={`flex items-center justify-center px-4 py-2 rounded-md text-white transition-colors ${
            isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
        }`}
        disabled={isLoading}
        >
        {isLoading ? (
            <span>
                Loading...
            </span>
        ) : (
            <span>
                {finished ? "Edit Mask" : "Finish Mask"}
            </span>
        )}
        </button>
    );
}

export default FinishButton;