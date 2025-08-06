import React, { useState, useEffect } from "react";
import {getTrainedModels} from "../../../../api/automatic_segmentation";

const ModelSelectionModal = ({ models, isOpen, onClose, onSelectModel }) => {
  if (!isOpen) return null;

  return (
    <div
        className="absolute top-[-350px] left-[-20px] w-[300px] h-[350px] overflow-y-scroll shadow-2xl bg-white p-6 rounded-lg "
    >
      <div>
        <div className="relative space-y-4 flex-col">
          {models.map((model) => (
            <ModelEntry key={model.job_id} model={model} onSelect={onSelectModel} />
          ))}
        </div>
      </div>
    </div>
  );
};

function formatDice(score) {
    if (score === null || score === undefined || isNaN(score) || score < 0) return "--";
    return Math.round(score * 100) + "%";
}

const ModelEntry = ({ model, onSelect }) => {
  return (
    <div
      onClick={() => onSelect(model)}
      className="p-4 border rounded-lg cursor-pointer hover:bg-gray-100"
    >
      <h3 className="font-bold">#{model.job_id} - {model.Name}</h3>
      <p>Test Dice: {formatDice(model["best_test_dice"])}</p>
    </div>
  );
};

export default ModelSelectionModal;