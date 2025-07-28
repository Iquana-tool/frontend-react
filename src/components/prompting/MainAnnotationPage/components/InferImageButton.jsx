import {Loader2, Fullscreen} from "lucide-react";
import {segmentBatchOfImages} from "../../../../api/automatic_segmentation";
import React, { useState } from "react";

async function handleInferImage(image) {
    //TODO: Implement the actual inference logic here. See InferenceInferenceCard.jsx for an example.
}


export default function InferImageButton({ image }) {
    const [isInfering, setIsInfering] = useState(false);
    return (
        <button
            onClick={onInfer}
            disabled={isInfering}
            className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-colors font-medium ${
                isInfering ? "bg-gray-400 text-white cursor-not-allowed" : "bg-violet-600 text-white hover:bg-violet-700"
            }`}
        >
            {isInfering ? (
                <>
                    <Loader2 className="w-8 h-8 animate-spin"/>
                    <span>Inferring {inferredImages} of {totalImages}...</span>
                </>
            ) : (
                <>
                    <Fullscreen className="w-8 h-8"/>
                    <span>Infer Images</span>
                </>
            )}
        </button>
    );
}
