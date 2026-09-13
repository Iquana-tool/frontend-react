import React from "react";

const AISegmentationSection = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-t1 mb-3">AI-Powered Segmentation</h3>
        <p className="text-t2 mb-4">
          Leverage the AI models to automatically segment coral regions in your images. 
          The AI can identify different coral types and provide accurate segmentation masks.
        </p>
      </div>

      <div>
        <h4 className="font-semibold text-t1 mb-4 text-lg">How It Works</h4>
        <div className="space-y-4">
          <div className="flex items-start space-x-4">
            <div className="bg-acS text-ac rounded-full w-8 h-8 flex items-center justify-center text-base font-semibold flex-shrink-0 mt-0.5">
              1
            </div>
            <div>
              <h5 className="font-medium text-t1 text-base">Select Model</h5>
              <p className="text-t2 text-base">Choose the desired AI Segmentation Model from the sidebar dropdown for prompted segmentation, or select a Suggestion Model for suggestion segmentation</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="bg-acS text-ac rounded-full w-8 h-8 flex items-center justify-center text-base font-semibold flex-shrink-0 mt-0.5">
              2
            </div>
            <div>
              <h5 className="font-medium text-t1 text-base">Draw Prompts</h5>
              <p className="text-t2 text-base">Add point prompts (left-click for positive, right-click for negative) or box prompts (click and drag to create a bounding box)</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="bg-acS text-ac rounded-full w-8 h-8 flex items-center justify-center text-base font-semibold flex-shrink-0 mt-0.5">
              3
            </div>
            <div>
              <h5 className="font-medium text-t1 text-base">Run Segmentation</h5>
              <p className="text-t2 text-base">
                Enable "Instant Prompted Segmentation" for automatic processing, or click "Run AI Segmentation" button to process manually
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="bg-acS text-ac rounded-full w-8 h-8 flex items-center justify-center text-base font-semibold flex-shrink-0 mt-0.5">
              4
            </div>
            <div>
              <h5 className="font-medium text-t1 text-base">Assign Label & Review</h5>
              <p className="text-t2 text-base">
                The object is created as unreviewed. Click "Accept" to assign a label, which moves it to reviewed status. 
                Use refinement mode (double-click object) to improve boundaries if needed.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-t1 mb-4 text-lg">Instant Prompted Segmentation</h4>
        <div className="bg-acS border border-acLn rounded-lg p-6">
          <p className="text-ac mb-4">
            Instant Prompted Segmentation automatically triggers AI segmentation whenever you add a prompt. 
            This feature significantly speeds up the annotation workflow by providing immediate feedback.
          </p>
          <div className="space-y-3">
            <div className="bg-p1 p-4 rounded-lg">
              <h5 className="font-medium text-t1 mb-2">Benefits:</h5>
              <ul className="text-sm text-t2 space-y-1">
                <li>• Real-time feedback as you add prompts</li>
                <li>• Faster workflow - no need to click "Run AI Segmentation" button</li>
                <li>• Immediate visual confirmation of segmentation quality</li>
                <li>• Easier iterative refinement</li>
              </ul>
            </div>
            <div className="bg-p1 p-4 rounded-lg">
              <h5 className="font-medium text-t1 mb-2">When to use:</h5>
              <ul className="text-sm text-t2 space-y-1">
                <li>• When you want immediate feedback on your prompts</li>
                <li>• For rapid annotation workflows</li>
                <li>• When iteratively refining segmentations</li>
              </ul>
            </div>
            <div className="bg-p1 p-4 rounded-lg">
              <h5 className="font-medium text-t1 mb-2">When to disable:</h5>
              <ul className="text-sm text-t2 space-y-1">
                <li>• When adding multiple prompts before running segmentation</li>
                <li>• For slower connections where automatic processing might be disruptive</li>
                <li>• When you prefer manual control over when segmentation runs</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-t1 mb-4 text-lg">Available Prompt Types</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-ln rounded-lg p-4">
            <h5 className="font-medium text-t1 mb-2">Point Prompts</h5>
            <ul className="text-sm text-t2 space-y-1">
              <li>• <strong>Left-click:</strong> Positive point (include this area)</li>
              <li>• <strong>Right-click:</strong> Negative point (exclude this area)</li>
              <li>• Add multiple points for better guidance</li>
              <li>• Most precise for fine-grained control</li>
            </ul>
          </div>
          <div className="border border-ln rounded-lg p-4">
            <h5 className="font-medium text-t1 mb-2">Box Prompts</h5>
            <ul className="text-sm text-t2 space-y-1">
              <li>• <strong>Click and drag:</strong> Create a bounding box around the object</li>
              <li>• Quick way to specify region of interest</li>
              <li>• Only the last box prompt is used if multiple boxes are drawn</li>
              <li>• Best for larger objects or initial segmentation</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 p-4 bg-acS border border-acLn rounded-lg">
          <p className="text-sm text-ac">
            <strong>Note:</strong> These are the only two prompt types available. Labels are assigned after the object is created, not before drawing prompts.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AISegmentationSection; 