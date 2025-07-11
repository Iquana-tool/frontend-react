import React from "react";
import { Info } from "lucide-react";

// Helper functions (if you want, you can move those out)
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

/**
 * ModelCard: Display info about a selected model.
 *
 * Props:
 * - model: the full model object (base or trained)
 */
export default function InferenceModelCard({ model }) {
    if (!model) return null;

    const isTrained = model.job_id !== undefined;

    return (
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-2">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h4 className="text-sm font-medium text-gray-900">
                        {model.Name}
                    </h4>
                    <p className="text-sm text-gray-600 whitespace-normal break-words">{model.Description}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                    isTrained ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                }`}>
          {isTrained ? "Trained" : "Base"}
        </span>
            </div>
            <div className="flex flex-col space-y-1 text-sm text-gray-500">
                <span>Training speed: {model["Training speed"]}</span>
                <span>Model size: {model["Model size"]}</span>
                {!isTrained && (
                    <>
                        <span>Automatically tuned: {model["Automatically tuned"] ? "Yes" : "No"}</span>
                        <span>Pre-trained: {model["Pre-trained"] ? "Yes" : "No"}</span>
                    </>
                )}
                {isTrained && (
                    <>
                        <span>Training rounds: {model.epoch}</span>
                        {/* Dice Score Panel */}
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
                                    <div className={`text-base font-bold ${getDiceColor(model.train_dice)}`}>
                                        {formatDice(model.train_dice)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500">Validation</div>
                                    <div className={`text-base font-bold ${getDiceColor(model.val_dice)}`}>
                                        {formatDice(model.val_dice)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500">Test</div>
                                    <div className={`text-base font-bold ${getDiceColor(model.test_dice)}`}>
                                        {formatDice(model.test_dice)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}