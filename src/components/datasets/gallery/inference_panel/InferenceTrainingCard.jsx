import React, { useState, useEffect, useCallback } from "react";
import {Cpu, Loader, StopCircle, Info} from "lucide-react";
import {startTraining, cancelTraining, fetchModel} from "../../../../api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
    const [epochs, setEpochs] = useState(100);
    const [augment, setAugment] = useState(true);
    const [earlyStopping, setEarlyStopping] = useState(true);
    const [imageSize, setImageSize] = useState([256, 256]);
    const [customImageSize, setCustomImageSize] = useState("");
    const [tab, setTab] = useState(0);

    const [isStopping, setIsStopping] = useState(false);
    const [trainError, setTrainError] = useState(null);
    const isTraining = model && model.training === "in progress";
    const isStarting = model && model.training === "starting";
    const isTrained = model && model.job_id;

    // The unique job identifier is just the model_identifier!
    const jobId = model?.model_identifier;

    async function handleStartTraining() {
        setTrainError(null);
        try {
          const response = await startTraining({
                dataset_id: datasetId,
                model_identifier: model.model_identifier,   // e.g. "unet"
                epochs: epochs,
                augment: augment,
                image_size: imageSize,
                early_stopping: earlyStopping,
              });
          const modelData = await fetchModel(response.job_id);
          while (!(modelData)) {
            // Wait for the model data to be available
            await new Promise(resolve => setTimeout(resolve, 1000));
            const modelData = await fetchModel(response.job_id);
          }
          setSelectedModel(modelData.metadata);
        } catch (err) {
          setTrainError(err?.message || "Failed to start training.");
        }
    }

    async function handleCancelTraining() {
        setIsStopping(true);
        // Cancel the training
        await cancelTraining(model.job_id);
        while (model.training === "in progress") {
            // Wait for cancellation to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        setIsStopping(false);
    }

    // Polling logic
    useEffect(() => {
        if (!model || !model.job_id || !(isTraining || isStarting)) return;
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
    }, [model, isTraining, isStarting]);

    useEffect(() => {
        setImageSize(model.image_size);
    },  [isTrained]);

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
            <div className="flex items-center mb-3 space-x-2">
                <Cpu className="w-6 h-6 text-blue-600 mb-2" />
                <h3 className="text-base font-medium text-gray-900 mb-3">Training</h3>
            </div>
            <div className="space-y-3">
            {!isTraining && (
                <div className="space-y-3">
                    {/* Controls */}
                    <div>
                        <label className={`flex items-center cursor-pointer ${isTraining || isStarting ? "opacity-50" : ""}`}>
                            <span className="ml-2 text-sm text-gray-700">Steps: {epochs}</span>
                            <input type={"range"} min={0} max={500} step={20} value={epochs}
                                   onChange={e=>setEpochs(e.target.value)}
                                     className="ml-2 w-full"
                                   disabled={isTraining || isStarting}/>
                        </label>
                    </div>
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
                            disabled={isTraining || isStarting|| isTrained}
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
                                disabled={isTraining || isStarting || isTrained}
                            />
                        )}
                        {isTrained && (
                            <span className="relative inline-flex items-center cursor-pointer group">
                                <Info size={15} className="text-gray-400 ml-1" />
                                <span className="invisible group-hover:visible opacity-0 group-hover:opacity-100
                                                 absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-60 z-10
                                                 p-2 text-xs text-gray-700 bg-white border border-gray-300 rounded shadow-lg transition-opacity">
                                    {"Cannot change the image size of already trained models."}
                                </span>
                            </span>
                        )}
                    </div>
                </div>
                )}

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
                            <div>
                                {/* Progress Tabs */}
                                <div className="flex space-x-2 mt-2 mb-3">
                                    {["Dice", "IoU", "Loss"].map((tabName, idx) => (
                                        <button
                                            key={tabName}
                                            className={`text-xs px-3 py-1 rounded ${tab === idx 
                                                ? "bg-blue-500 text-white"
                                                : "bg-gray-200 text-gray-600 hover:bg-gray-300"}`}
                                            onClick={() => setTab(idx)}
                                            type="button"
                                        >
                                            {tabName}
                                        </button>
                                    ))}
                                </div>
                                {/* Tab Contents */}
                                <div className="w-full h-40">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={
                                                // prepare data array with columns: epoch, train, val
                                                (()=>{
                                                    const keys = [
                                                        ["train_dice", "val_dice"],
                                                        ["train_iou", "val_iou"],
                                                        ["train_loss", "val_loss"]
                                                    ][tab];
                                                    if (!model[keys[0]] || !model[keys[1]]) return [];
                                                    return (model[keys[0]] || []).map((val, i) => ({
                                                        epoch: i+1,
                                                        Train: val,
                                                        Val: (model[keys[1]][i] ?? null)
                                                    }));
                                                })()
                                            }
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="epoch" tick={{fontSize:10}} />
                                            <YAxis tick={{fontSize:10}} />
                                            <Tooltip />
                                            <Legend />
                                            <Line type="monotone" dataKey="Train" stroke="#2563EB" dot={false} />
                                            <Line type="monotone" dataKey="Val" stroke="#16A34A" dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        <ProgressBar current={model.epoch} total={model.total_epochs}/>
                        <div>
                            <button
                                onClick={handleCancelTraining}
                                className="w-full flex items-center justify-center space-x-2 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm mt-3"
                                >
                                {isStopping ? <Loader className="animate-spin" size={16} /> : <StopCircle size={16} />}
                                <span>{isStopping ? "Stopping" : "Stop Training"}</span>
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