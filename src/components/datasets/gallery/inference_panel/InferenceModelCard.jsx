import React, { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { fetchModel } from "../../../../api";

// Helper functions
function getDiceColor(score) {
    if (score === null || score === undefined || isNaN(score)) return "text-gray-400";
    if (score >= 0.85) return "text-green-600";
    if (score >= 0.7) return "text-orange-500";
    return "text-red-600";
}

function formatDice(score) {
    if (score === null || score === undefined || isNaN(score) || score < 0) return "--";
    return Math.round(score * 100) + "%";
}

function InfoRow({ icon, label, value, tooltip }) {
    return (
        <span className="flex items-center gap-2 relative group">
            <span>{icon}</span>
            <span className="font-medium">{label}:</span>
            <span>{value}</span>
            <span className="relative inline-flex items-center cursor-pointer">
                <Info size={15} className="text-gray-400 ml-1" />
                <span className="invisible group-hover:visible opacity-0 group-hover:opacity-100
                                 absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-60 z-10
                                 p-2 text-xs text-gray-700 bg-white border border-gray-300 rounded shadow-lg transition-opacity">
                    {tooltip}
                </span>
            </span>
        </span>
    );
}

/**
 * ModelCard: Display info about a selected model.
 *
 * Props:
 * - model: the full model object (base or trained)
 */
export default function InferenceModelCard({ model, setModel}) {
    const model_not_null = !(model === null || model === undefined)
    const isTrained = model_not_null && "job_id" in model
    const isTraining = model_not_null && (model.training_status === "in progress" || model.training_status === "starting");

    const tooltips = {
        num_classes: "Number of target categories the model predicts. More classes generally means increased complexity and may need more data.",
        image_size: "Size of input images. Larger images can capture more detail but require more memory and computation.",
        num_input_images: "Number of distinct images in the training set. More images help prevent overfitting and improve generalization.",
        "Training speed": "How quickly each training step occurs. Faster speed = less training time, but may depend on hardware efficiency.",
        "Model size": "The amount of memory the model occupies. Larger models may learn more complex patterns but need more resources.",
        "Automatically tuned": "Whether the model parameters were automatically optimized during training.",
        "Pre-trained": "Indicates if the model was initialized with weights from a pre-trained model, which can improve performance on small datasets.",
    };


    if (!model) return null;

    return (
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-2">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h4 className="text-sm font-medium text-gray-900">
                        {/* Model name with ID emoji */}
                        <span className="align-middle">🏷️</span> {model.Name || model.model_identifier}
                    </h4>
                    <p className="text-sm text-gray-600 whitespace-normal break-words">{model.Description}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                    isTrained ? (
                        isTraining ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800")
                        : "bg-blue-100 text-blue-800"
                }`}>
                    {isTrained ? (isTraining? "Training" : "Trained") : "Base"}
                </span>
            </div>
            <div className="flex flex-col space-y-1 text-sm text-gray-500">
                { isTrained && (
                    <div className="flex flex-col space-y-1 text-sm text-gray-500">
                    <InfoRow
                    icon="🧩"
                    label="Labels"
                    value={model.num_classes}
                    tooltip={tooltips.num_classes}
                />
                <InfoRow
                    icon="🖼️"
                    label="Image Size"
                    value={model.image_size.join("x")}
                    tooltip={tooltips.image_size}
                />
                <InfoRow
                    icon="🗂️"
                    label="Number of Train Images"
                    value={model.num_input_images}
                    tooltip={tooltips.num_input_images}
                />
                <InfoRow
                    icon="🕒"
                    label="Training Steps"
                    value={model.best_epoch}
                    tooltip="Total number of training steps completed."
                />
                </div>)
                }
                <InfoRow
                    icon="⚡"
                    label="Training Speed"
                    value={model["Training speed"]}
                    tooltip={tooltips["Training speed"]}
                />
                <InfoRow
                    icon="💾"
                    label="Model Size"
                    value={model["Model size"]}
                    tooltip={tooltips["Model size"]}
                />
                <InfoRow icon="✔️" label="Automatically Tuned"
                         value={model["Automatically tuned"] ? "Yes" : "No"}
                         tooltip={tooltips["Automatically tuned"]}
                />
                <InfoRow icon="🧠" label="Pre-trained"
                         value={model["Pre-trained"] ? "Yes" : "No"}
                         tooltip={tooltips["Pre-trained"]}
                />

                {/* DICE Score Panel, only if trained */}
                {isTrained && (
                    <div className="mt-2">
                        <div className="flex items-center mb-2 space-x-2">
                            <span className="font-semibold text-gray-700">Dice Scores</span>
                            <div className="relative group inline-block align-middle cursor-pointer">
                                <Info size={15} className="text-gray-400" />
                                <span className="invisible group-hover:visible opacity-0 group-hover:opacity-100
                                    absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-60 z-10
                                    p-2 text-xs text-gray-700 bg-white border border-gray-300 rounded shadow-lg transition-opacity">
                                    <b>Dice score</b> measures segmentation accuracy. 100% means perfect overlap between prediction and ground truth.
                                </span>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                                <div className="text-xs text-gray-500">Train</div>
                                <div className={`text-base font-bold ${getDiceColor(model.best_train_dice)}`}>
                                    {formatDice(model.best_train_dice)}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500">Validation</div>
                                <div className={`text-base font-bold ${getDiceColor(model.best_val_dice)}`}>
                                    {formatDice(model.best_val_dice)}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500">Test</div>
                                <div className={`text-base font-bold ${getDiceColor(model.best_test_dice)}`}>
                                    {formatDice(model.best_test_dice)}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}