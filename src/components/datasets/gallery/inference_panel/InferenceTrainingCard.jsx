import React, { useState, useEffect, useCallback } from "react";
import { Cpu, Loader } from "lucide-react";
import { getTrainingStatus } from "../../../../api";

const IMAGE_SIZE_PRESETS = [
    [256, 256], [512, 512], [1024, 1024],
];

export default function InferenceTrainingCard({
                                                  model,
                                                  datasetId,
                                                  onStart, // calls startTraining with params
                                                  loadingExternal
                                              }) {
    const [overwrite, setOverwrite] = useState(false);
    const [augment, setAugment] = useState(true);
    const [earlyStopping, setEarlyStopping] = useState(true);
    const [imageSize, setImageSize] = useState([256, 256]);
    const [customImageSize, setCustomImageSize] = useState("");
    const [apiLoading, setApiLoading] = useState(false);
    const [jobStatus, setJobStatus] = useState(null);
    const [trainError, setTrainError] = useState(null);

    // The unique job identifier is just the model_identifier!
    const jobId = model?.model_identifier;

    const checkJobStatus = useCallback(async () => {
        if (!jobId) return setJobStatus(null);
        try {
            const res = await getTrainingStatus(jobId);
            setJobStatus(res);
        } catch (err) {
            setJobStatus({ status: "error", message: err?.message || "Training status fetch failed." });
        }
    }, [jobId]);

    // Check status on mount and on new model
    useEffect(() => {
        setJobStatus(null);
        if (jobId) checkJobStatus();
        // Optional: could add interval polling, e.g. every 10s, if you want live bar while running
        // See below for simple polling
    }, [jobId, checkJobStatus]);

    // Optional: polling while job running
    useEffect(() => {
        if (!jobId || jobStatus?.status !== "In progress") return;
        const intv = setInterval(() => {
            checkJobStatus();
        }, 8000);
        return () => clearInterval(intv);
        // Only runs while job running!
    }, [jobId, jobStatus?.status, checkJobStatus]);

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
    async function handleStartTraining() {
        setApiLoading(true);
        setTrainError(null);
        try {
            await onStart({
                model_identifier: model.model_identifier,
                overwrite,
                augment,
                image_size: imageSize,
                early_stopping: earlyStopping,
            });
            // optionally, re-fetch job status right after
            checkJobStatus();
        } catch (e) {
            setTrainError(e?.message || "Failed to start training.");
        } finally {
            setApiLoading(false);
        }
    }

    const trainingRunning = jobStatus?.status === "running";
    const anyLoading = apiLoading || loadingExternal;

    return (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-5">
            <h3 className="text-base font-medium text-gray-900 mb-3">Training Settings</h3>
            <div className="space-y-3">
                {/* Controls */}
                <div>
                    <label className="flex items-center cursor-pointer">
                        <input type="checkbox" checked={overwrite} onChange={e=>setOverwrite(e.target.checked)} className="mr-2" disabled={trainingRunning||anyLoading}/>
                        Overwrite existing model (reset training)
                    </label>
                </div>
                <div>
                    <label className="flex items-center cursor-pointer">
                        <input type="checkbox" checked={augment} onChange={e=>setAugment(e.target.checked)} className="mr-2" disabled={trainingRunning||anyLoading}/>
                        Data Augmentation
                    </label>
                </div>
                <div>
                    <label className="flex items-center cursor-pointer">
                        <input type="checkbox" checked={earlyStopping} onChange={e=>setEarlyStopping(e.target.checked)} className="mr-2" disabled={trainingRunning||anyLoading}/>
                        Early Stopping
                    </label>
                </div>
                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Image Size:</label>
                    <select
                        value={IMAGE_SIZE_PRESETS.some(p=>JSON.stringify(p)===JSON.stringify(imageSize)) ? JSON.stringify(imageSize) : "custom"}
                        onChange={handleImageSizeChange}
                        className="px-2 py-1 border rounded"
                        disabled={trainingRunning||anyLoading}
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
                            disabled={trainingRunning||anyLoading}
                        />
                    )}
                </div>
                {/* Button/Progress */}
                {!trainingRunning
                    ? <button
                        onClick={handleStartTraining}
                        className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm mt-3"
                        disabled={anyLoading || !model.model_identifier}
                    >
                        <Cpu size={16}/>
                        <span>{anyLoading ? "Starting..." : "Start Training"}</span>
                    </button>
                    : <div className="flex flex-col items-center py-2">
                        <div className="flex items-center justify-center space-x-2">
                            <Loader className="animate-spin" size={16} />
                            <span className="text-blue-700">Training in progress...</span>
                        </div>
                        {jobStatus && jobStatus.current_epoch !== undefined && (
                            <div className="w-full mt-2">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-500 h-2 rounded-full transition-all"
                                        style={{
                                            width: `${Math.round(
                                                100 * ((jobStatus.current_epoch + 1) / (jobStatus.max_epochs || 1))
                                            )}%`,
                                        }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-xs mt-1">
                                    <span>Epoch {jobStatus.current_epoch + 1} / {jobStatus.max_epochs}</span>
                                    <span>Status: {jobStatus.status}</span>
                                </div>
                            </div>
                        )}
                        {jobStatus && jobStatus.status && jobStatus.status !== "running" && (
                            <div className="text-sm text-gray-600 mt-2">
                                Status: {jobStatus.status}
                                {jobStatus.message && " - " + jobStatus.message}
                            </div>
                        )}
                    </div>}
                {trainError && (
                    <div className="text-red-700 text-sm">{trainError}</div>
                )}
            </div>
        </div>
    );
}