import React, { useEffect, useState, useRef } from "react";
import { Brain, Info } from "lucide-react";
import { segmentBatchOfImages, fetchImagesWithAnnotationStatus} from "../../../../api";


const batchSize = 1; // Adjust batch size as needed


function ProgressBar({ current, total }) {
    if (!total || total === 0) return null;
    const percent = Math.min(100, Math.round((current / total) * 100));
    return (
        <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Training Progress:</span>
                <span>{current} / {total} {batchSize == 1 ? "Images" : "Batches"}</span>
            </div>
            <div className="w-full bg-gray-200 rounded h-2">
                <div
                    className="bg-violet-500 h-2 rounded"
                    style={{ width: `${percent}%`, transition: 'width 0.5s' }}
                />
            </div>
        </div>
    );
}


export default function InferenceInferenceCard({ model, dataset }) {
    const [isLoading, setIsLoading] = useState(false);
    const [images, setImages] = useState([]);
    const [manualAnnotations, setManualAnnotations] = useState(false);
    const [automaticAnnotations, setAutomaticAnnotations] = useState(false);
    const [pendingAnnotations, setPendingAnnotations] = useState(false);
    const [isInfering, setIsInfering] = useState(false);
    const [inferredImages, setInferredImages] = useState(0);
    const cancelInferenceRef = useRef(false);
    const [cancelInference, setCancelInference] = useState(false);
    const isTrained = model && "job_id" in model;
    const isTraining = model && (model.training_status === "in progress" || model.training_status === "starting");

    useEffect(() => {
        console.log("Cancel Triggered");
        cancelInferenceRef.current = cancelInference;
        setInferredImages(0);
    }, [cancelInference]);

    const handleInference = async () => {
        if (!model || !images) return;
        try {
            setIsInfering(true);
            const num_batches = Math.ceil(images.length / batchSize); // assuming batch size of 10
            for (let i = 0; i < num_batches; i++) {
                if (cancelInferenceRef.current) {
                    setIsInfering(false);
                    setCancelInference(false);
                    return;
                }
                const batch = images.slice(i * batchSize, (i + 1) * batchSize); // adjust batch size as needed
                console.log(`Processing batch ${i + 1}/${num_batches} with ${batch.length} images: `, batch);
                console.log(`Model Job ID: ${model.job_id}`);
                const result = await segmentBatchOfImages(model.job_id, batch);
                setInferredImages(prev => prev + batch.length);
            }
            // wait for 5 seconds before resetting states
            await new Promise(resolve => setTimeout(resolve, 5000));
            console.log("Inference completed successfully.");
        } catch (error) {
            console.error("Inference error:", error);
        } finally {
            // Reset states after inference
            setIsLoading(false);
            setIsInfering(false);
            setCancelInference(false);
            setInferredImages(0);
        }
    };

    useEffect(() => {
        let cancelled = false; // optional: prevent state updates on unmount
        const fetchImages = async () => {
            let imageIds = [];
            if (manualAnnotations) {
                const response = await fetchImagesWithAnnotationStatus(dataset.id, "finished");
                imageIds = [...imageIds, ...response.images];
            }
            if (automaticAnnotations) {
                const response = await fetchImagesWithAnnotationStatus(dataset.id, "generated");
                imageIds = [...imageIds, ...response.images];
            }
            if (pendingAnnotations) {
                const response = await fetchImagesWithAnnotationStatus(dataset.id, "missing");
                imageIds = [...imageIds, ...response.images];
            }
            setImages(imageIds);
        };
        fetchImages();
        // cleanup for async (not always needed if you're not updating state)
        return () => { cancelled = true; };
    }, [manualAnnotations, automaticAnnotations, pendingAnnotations, dataset.id, cancelInference]);

    return (
        <div className="p-4 bg-white rounded-lg shadow-md">
            <div className="flex items-center gap-2 mb-4">
                <Brain size={20} className="text-violet-600" />
                <h3 className="text-lg font-semibold">Inference</h3>
            </div>
            {isTrained && !isTraining && (
                <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">
                        Run inference on the dataset using the selected model.
                    </p>
                    <div className={`gap-2 mb-2 ${isLoading ? "opacity-50 pointer-events-none" : ""}`}>
                        <label className="flex items-center cursor-pointer">
                            <input type="checkbox"
                                    checked={manualAnnotations}
                                    onChange={(e) => setManualAnnotations(e.target.checked)}
                                   className="mr-2"
                                   disabled={isInfering}/>
                            Manual Annotations
                        </label>
                    </div>
                    <div className={`gap-2 mb-2 ${isLoading ? "opacity-50 pointer-events-none" : ""}`}>
                        <label className="flex items-center cursor-pointer">
                            <input type="checkbox"
                                     checked={automaticAnnotations}
                                        onChange={(e) => setAutomaticAnnotations(e.target.checked)}
                                   className="mr-2"
                                   disabled={isInfering}/>
                            Automatic Annotations
                        </label>
                    </div>
                    <div className={`gap-2 mb-2 ${isLoading ? "opacity-50 pointer-events-none" : ""}`}>
                        <label className="flex items-center cursor-pointer">
                            <input type="checkbox"
                                     checked={pendingAnnotations}
                                     onChange={(e) => setPendingAnnotations(e.target.checked)}
                                   className="mr-2"
                                   disabled={isInfering}/>
                            Pending Annotations
                        </label>
                    </div>
                    <div className="text-sm text-yellow-600 mb-2 gap-2">
                        <Info size={16} className="inline mr-1" />
                        Note: Inference will overwrite any existing annotations on the selected images.
                    </div>
                    {isInfering && (
                        <div className="text-sm text-gray-500 mb-2">
                            <Info size={16} className="inline mr-1" />
                            Running inference...
                            <ProgressBar current={inferredImages} total={images.length} />
                            <button
                                onClick={() => {setCancelInference((prev) => !prev);}}
                                disabled={!model || !dataset }
                                className={`px-4 py-2 w-full rounded-md ${isLoading ? "bg-gray-300" : "bg-red-600 hover:bg-red-700"} text-white`}
                            >
                                {`Cancel Inference`}
                            </button>
                        </div>
                    )}
                    {!isInfering && (
                        <div className="text-sm text-gray-500 mb-2">
                            <button
                                onClick={handleInference}
                                disabled={!model || !dataset || isInfering}
                                className={`px-4 py-2 w-full rounded-md ${isLoading ? "bg-gray-300" : "bg-violet-600 hover:bg-violet-700"} text-white`}
                            >
                                {isInfering ? "Running..." : `Run Inference on ${images.length} Images`}
                            </button>
                        </div>
                    )}
             </div>
            )}
            {isTraining && (
                <div className="text-sm text-yellow-600 mb-2">
                    <Info size={16} className="inline mr-1" />
                    The model is currently training. Inference will be available once training is complete.
                </div>
            )}
            {!isTrained &&
                <div className="text-gray-500 mt-2">
                    <Info size={16} className="inline mr-1" />
                    <span>
                        Inference can only be run on trained models. Please train a model first.
                    </span>
                </div>
            }
        </div>
    );
}
