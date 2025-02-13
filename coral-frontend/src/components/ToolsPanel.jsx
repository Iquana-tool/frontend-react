export default function ToolsPanel({ onUndo, onSave, onReset }) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Segmentation Tools</h3>
        <div className="flex flex-col space-y-2">
          <button
            onClick={onReset}
            className="px-4 py-2 bg-coral-blue text-white rounded hover:bg-blue-600 transition-colors"
          >
            New Polygon
          </button>
          <button
            onClick={onUndo}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            Undo Last Point
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-marine-green text-white rounded hover:bg-green-600 transition-colors"
          >
            Save Mask
          </button>
        </div>
      </div>
    )
  }