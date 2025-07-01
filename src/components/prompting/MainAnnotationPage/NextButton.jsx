import React, { useState, useEffect } from "react";
import {fetchImagesWithAnnotationStatus} from "../../../api/images";
import {useDataset} from "../../../contexts/DatasetContext";
import { ArrowRight, Loader2 } from "lucide-react";


const NextButton = () => {
    const [isLoading, setIsLoading] = useState(false);
    const datasetsContext = useDataset();
    const {
        datasets,
        currentDataset,
        loading,
        error,
        fetchDatasets,
        createDataset,
        deleteDataset,
        selectDataset,
        getAnnotationProgress,
        getSampleImages,
        setError
    } = datasetsContext;
    useEffect(() => {
        console.log(currentDataset)
    }, [currentDataset]);

    const handleNext = async () => {
        setIsLoading(true);
        try {
        // Simulate an API call to fetch the next image
        const response = await fetchImagesWithAnnotationStatus(currentDataset.id, "missing");
        if (!response.ok) {
            throw new Error("Failed to fetch the next image");
        }
        console.warn("Next button pressed, but the actual image fetching logic is not implemented yet.");
        // Handle the next image data as needed
        } catch (err) {
            console.error("Error fetching next image:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleNext}
            disabled={isLoading}
            className={`
                group flex items-center gap-2 justify-center px-4 py-2 rounded-xl text-white font-semibold
                transition-all duration-300 ease-in-out transform hover:scale-[1.02] active:scale-[0.98]
                shadow-lg hover:shadow-xl backdrop-blur-sm border border-white/20
                ${
                    isLoading
                        ? "bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed shadow-none scale-100"
                        : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-indigo-500/25 hover:shadow-indigo-500/40"
                }
                min-w-[100px] relative overflow-hidden
                before:absolute before:inset-0 before:bg-white/10 before:translate-x-[-100%] 
                hover:before:translate-x-[100%] before:transition-transform before:duration-700 before:ease-out
            `}
        >
            {isLoading ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="animate-pulse">Loading...</span>
                </>
            ) : (
                <>
                    <span>Next</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                </>
            )}

            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent
                         opacity-0 group-hover:opacity-100 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%]
                         transition-all duration-700 ease-out"></div>
        </button>
    );
}

export default NextButton;