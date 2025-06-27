import React from "react";


const SidebarModelSelector = ({
    selectedModel,
    handleModelChange,
    loading}) => {
    return (
        <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1 text-teal-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path d="M13 7H7v6h6V7z"/>
                    <path
                        fillRule="evenodd"
                        d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 010-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z"
                        clipRule="evenodd"
                    />
                </svg>
                Segmentation Model:
            </label>
            <div className="relative">
                <select
                    className="block w-full px-4 py-2 pr-8 leading-tight bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 appearance-none"
                    value={selectedModel}
                    onChange={handleModelChange}
                    disabled={loading}
                >
                    <option value="Mockup">Mockup (For Testing)</option>
                    <option value="SAM2Tiny">SAM2 Tiny (Default)</option>
                    <option value="SAM2Small">SAM2 Small</option>
                    <option value="SAM2Large">SAM2 Large</option>
                    <option value="SAM2BasePlus">SAM2 Base Plus</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg
                        className="fill-current h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                    >
                        <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                        />
                    </svg>
                </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 italic">
                Larger models may be more accurate but will take longer to
                process.
            </p>
        </div>
    )
}

export default SidebarModelSelector;
