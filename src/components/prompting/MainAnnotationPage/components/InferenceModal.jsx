import React, { useState, useEffect } from "react";
import {getTrainedModels} from "../../../../api/automatic_segmentation";

async function getAvailableModels(dataset_id){
    try {
        return await getTrainedModels(dataset_id);
    } catch (e) {
        console.error(e);
    }
}

const ModelSelectionModal = ({ dataset_id, isOpen, onClose, onSelectModel }) => {
  const [models, setModels] = useState([]);

  useEffect(() => {
    const fetchModels = async () => {
      const availableModels = await getAvailableModels(dataset_id);
      console.log(availableModels)
      setModels(availableModels.models);
    };

    if (isOpen) {
      fetchModels();
    }
  }, [isOpen, dataset_id]);

  if (!isOpen) return null;

  return (
    <div
        className="absolute top-[-400px] left-[-20px] w-[300px] h-[350px] overflow-y-scroll"
    >
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4">Select a Model</h2>
        <div className="relative space-y-4 flex-col">
          {models.map((model) => (
            <ModelEntry key={model.job_id} model={model} onSelect={onSelectModel} />
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-gray-500 text-white rounded-lg"
        >
          Close
        </button>
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
      <h3 className="font-bold">{model.Name}</h3>
      <p>Training Dice: {formatDice(model["best_train_dice"])}</p>
      <p>Test Dice: {formatDice(model["best_test_dice"])}</p>
    </div>
  );
};

export default ModelSelectionModal;