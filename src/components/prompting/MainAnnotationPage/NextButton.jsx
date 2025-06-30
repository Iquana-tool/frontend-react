import React, { useState, useEffect } from "react";
import {fetchImagesWithAnnotationStatus} from "../../../api/images";


const NextButton = ({dataset_id}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleNext = async () => {
        setIsLoading(true);
        try {
        // Simulate an API call to fetch the next image
        const response = await fetchImagesWithAnnotationStatus(dataset_id, "missing");
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
        className="btn btn-primary"
        >
        {isLoading ? "Loading..." : "Next"}
        </button>
    );
}

export default NextButton;