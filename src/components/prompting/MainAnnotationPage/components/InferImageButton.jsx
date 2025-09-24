import React, {useEffect, useState} from "react";
import ModelSelectionModal from "./InferenceModal";
import {getTrainedModels, segmentBatchOfImages} from "../../../../api/automatic_segmentation"; // Adjust the import path as necessary
import {Loader2, Fullscreen, ChevronDown, ChevronUp} from "lucide-react";

async function getAvailableModels(dataset_id){
    try {
        const response = await getTrainedModels(dataset_id);
        let models = response.models || [];
        //Sort the models based on their test dice (key: "best_test_dice")
        models.sort((a, b) => b.best_test_dice - a.best_test_dice);
        return models
    } catch (e) {
        console.error(e);
        return []; // Return empty array on error
    }
}

export default function InferImageButton({ dataset_id, selectedImageId }) {
  const [isInferring, setIsInferring] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
  const [models, setModels] = useState([]);
  const modelsAvailable = Array.isArray(models) && models.length > 0;  // we have at least one trained model

  const handleInferImage = async () => {
    if (!selectedModel) {
      setIsModalOpen(true);
      return;
    }

    setIsInferring(true);
    try {
      await segmentBatchOfImages(selectedModel.job_id, [selectedImageId]);
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setIsInferring(false);
    }
  };

  const handleSelectModel = (model) => {
    setSelectedModel(model);
    setIsModalOpen(false);
  };

  useEffect(() => {
    const fetchModels = async () => {
      const availableModels = await getAvailableModels(dataset_id);
      console.log(availableModels)
      setModels(availableModels || []); // Ensure it's always an array
    };
    fetchModels();
  }, [dataset_id]);

  return (
    <div className="flex items-center">
      <button
        disabled={isInferring || !modelsAvailable}
        className={`
          group flex items-center justify-center p-2 rounded-xl text-white font-semibold
          transition-all duration-300 ease-in-out transform hover:scale-[1.02] active:scale-[0.98]
          shadow-lg hover:shadow-xl backdrop-blur-sm border border-white/20
          ${
            isInferring || !modelsAvailable
              ? "bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed shadow-none scale-100"
              : "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-violet-500/25 hover:shadow-violet-500/40"
          }
          relative overflow-hidden h-10
          before:absolute before:inset-0 before:bg-white/10 before:translate-x-[-100%]
          hover:before:translate-x-[100%] before:transition-transform before:duration-700 before:ease-out
        `}
        onClick={() => {
          setIsModalOpen(!isModalOpen);
        }}
        title="Select a model for inference"
      >
        {isModalOpen ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      <button
        onClick={handleInferImage}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        disabled={isInferring || !modelsAvailable}
        className={`
              group flex items-center gap-2 justify-center px-4 py-1 rounded-xl text-white font-semibold
              transition-all duration-300 ease-in-out transform hover:scale-[1.02] active:scale-[0.98]
              shadow-lg hover:shadow-xl backdrop-blur-sm border border-white/20
              ${
                isInferring || !modelsAvailable
                  ? "bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed shadow-none scale-100"
                  : "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-violet-500/25 hover:shadow-violet-500/40"
              }
              h-10 w-fit relative overflow-hidden
              before:absolute before:inset-0 before:bg-white/10 before:translate-x-[-100%]
              hover:before:translate-x-[100%] before:transition-transform before:duration-700 before:ease-out
            `}

      >

        {isInferring ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="animate-pulse hidden 2xl:inline">Inferring...</span>
          </>
        ) : (
          <>
            <Fullscreen className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
            <nobr>
                <span className="hidden 2xl:inline">
                  {selectedModel ? `${selectedModel.Name}` : (`${modelsAvailable ? `Select Model` : "No models available"}`)}
                </span>
            </nobr>
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-700 ease-out"></div>
      </button>

      {showTooltip && (
        <div className="absolute bottom-[60px] left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg z-50 whitespace-nowrap">
          <span className="text-xs">Run automatic inference on this image. {modelsAvailable ? `${models.length} trained models are available.` : 'There are currently no trained models available'} </span>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-gray-800"></div>
        </div>
      )}
      <ModelSelectionModal
        models={models}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectModel={handleSelectModel}
      />
</div>

  );
}

