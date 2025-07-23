import React, { useState, useEffect, useCallback } from "react";
import { Cpu, Loader, StopCircle } from "lucide-react";
import {startTraining, cancelTraining, fetchModel} from "../../../../api";

const IMAGE_SIZE_PRESETS = [
    [256, 256], [512, 512], [1024, 1024],
];

function ProgressBar({ current, total }) {
    if (!total || total === 0) return null;
    const percent = Math.min(100, Math.round((current / total) * 100));
    return (
        <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Training Progress:</span>
                <span>{current} / {total} epochs</span>
            </div>
            <div className="w-full bg-gray-200 rounded h-2">
                <div
                    className="bg-blue-500 h-2 rounded"
                    style={{ width: `${percent}%`, transition: 'width 0.5s' }}
                />
            </div>
        </div>
    );
}

export default function InferenceTrainingCard({
                                              model,
                                                  setSelectedModel,
                                              datasetId,
                                              }) {
    const [overwrite, setOverwrite] = useState(false);
    const [augment, setAugment] = useState(true);
    const [earlyStopping, setEarlyStopping] = useState(true);
    const [imageSize, setImageSize] = useState([256, 256]);
    const [customImageSize, setCustomImageSize] = useState("");

    const [trainError, setTrainError] = useState(null);
    const isTraining = model && model.training === "in progress";
    const isStarting = model && model.training === "starting";

    // The unique job identifier is just the model_identifier!
    const jobId = model?.model_identifier;

    async function handleStartTraining() {
        setTrainError(null);
        try {
          const response = await startTraining({
                dataset_id: datasetId,
                model_identifier: model.model_identifier,   // e.g. "unet"
                overwrite: false,
                augment: augment,
                image_size: imageSize,
                early_stopping: earlyStopping,
              });
          const modelData = await fetchModel(response.job_id);
          setSelectedModel(modelData.metadata);
        } catch (err) {
          setTrainError(err?.message || "Failed to start training.");
        }
    }

    async function cancelTraining() {
        if (!model || !model.job_id) return;
        // Cancel the training
        await cancelTraining(model.job_id);
        // Wait 3 seconds for cancellation to process
        await new Promise(resolve => setTimeout(resolve, 3000));
        // Reset the model state
        setSelectedModel(null);
    }

    // Polling logic
    useEffect(() => {
        if (!model || !model.job_id || model.training !== "in progress") return;
        let cancelled = false;

        const interval = setInterval(async () => {
            try {
                const response = await fetchModel(model.job_id);
                // Check structure: use response, response.metadata, etc.
                // For best robustness, merge or fallback with initialModel:
                // If your API returns {metadata: {...}}, use:
                let updatedModel = response.metadata;

                if (!cancelled && updatedModel) {
                    setSelectedModel(updatedModel);
                    if (updatedModel.training !== "in progress") {
                        clearInterval(interval); // Stop polling when done
                    }
                }
            } catch (e) {
                // silently ignore for now (could add error state)
                console.error("Error fetching training status:", e);
            }
        }, 5000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
        // Only reset effect if job_id changes
    }, [model, isTraining]);

    function handleImageSizeChange(e) {
        if (e.target.value === "custom") {
            setImageSize("");
        } else {
            setImageSize(JSON.parse(e.target.value));
        }
    }
    function handleCustomImageSize(e) {
        setCustomImageSize(e.target.value);
        const m = e.target.value.match(/^(\d+)\s*[xX]\s*(\d+)$/);
        if (m) setImageSize([parseInt(m[1]), parseInt(m[2])]);
        else setImageSize("");
    }

    return (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-5">
            <h3 className="text-base font-medium text-gray-900 mb-3">Training Settings</h3>
            <div className="space-y-3">
                {/* Controls */}
                <div>
                    <label className="flex items-center cursor-pointer">
                        <input type="checkbox" checked={augment}
                               onChange={e=>setAugment(e.target.checked)}
                               className="mr-2"
                               disabled={isTraining || isStarting}/>
                        Data Augmentation
                    </label>
                </div>
                <div>
                    <label className="flex items-center cursor-pointer">
                        <input type="checkbox"
                               checked={earlyStopping}
                               onChange={e=>setEarlyStopping(e.target.checked)}
                               className="mr-2"
                               disabled={isTraining || isStarting}/>
                        Early Stopping
                    </label>
                </div>
                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Image Size:</label>
                    <select
                        value={IMAGE_SIZE_PRESETS.some(p=>JSON.stringify(p)===JSON.stringify(imageSize)) ? JSON.stringify(imageSize) : "custom"}
                        onChange={handleImageSizeChange}
                        className="px-2 py-1 border rounded"
                        disabled={isTraining || isStarting}
                    >
                        {IMAGE_SIZE_PRESETS.map(sz => (
                            <option key={sz.join("x")} value={JSON.stringify(sz)}>{sz[0]} x {sz[1]}</option>
                        ))}
                        <option value="custom">Custom</option>
                    </select>
                    {(!IMAGE_SIZE_PRESETS.some(p=>JSON.stringify(p)===JSON.stringify(imageSize))) && (
                        <input
                            type="text"
                            placeholder="e.g. 128x128"
                            className="px-2 py-1 border rounded w-24"
                            value={customImageSize}
                            onChange={handleCustomImageSize}
                            disabled={isTraining || isStarting}
                        />
                    )}
                </div>
                {/* Button/Progress */}
                {!isTraining
                    ? <button
                        onClick={handleStartTraining}
                        className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm mt-3"
                        disabled={!model}
                    >
                        {isStarting ? <Loader className="animate-spin" size={16} /> : <Cpu size={16}/>}
                        <span>{isStarting ? "Starting" : "Start Training"}</span>
                    </button>
                    :
                    <div>
                        <ProgressBar current={model.epoch} total={model.total_epochs}/>
                        <div>
                            <button
                                onclick={cancelTraining}
                                className="w-full flex items-center justify-center space-x-2 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm mt-3"
                                >
                                <StopCircle size={16} />

                                <span>Stop Training</span>
                            </button>
                        </div>
                    </div>
            }
                {trainError && (
                    <div className="text-red-700 text-sm">{trainError}</div>
                )}
            </div>
        </div>
    );
}