import React from "react";
import {Image, MousePointer, Crosshair, Square, Pentagon, Eraser, ZoomIn, ZoomOut, Play, Check, ArrowRight } from "lucide-react";

const AnnotationSection = () => {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Annotation Interface Overview</h3>
        <p className="text-gray-700 mb-4">
          The AquaMorph annotation interface provides a comprehensive set of tools for marking, 
          segmenting, and analyzing coral regions in your images. The interface is divided into 
          three main areas: the sidebar for image management, the main drawing area, and the results panel.
        </p>
      </div>



      {/* Drawing Tools */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-4 text-lg">Drawing Tools & Prompts</h4>
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <h5 className="font-medium text-gray-900 mb-3">Annotation Tools</h5>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <MousePointer className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">Cursor - Select and move elements</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Crosshair className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">Point Tool - Click to add annotation points</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Square className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">Rectangle Tool - Draw rectangular selections</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Pentagon className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">Polygon Tool - Create custom polygon shapes</span>
              </div>
              
            </div>
          </div>

          <div>
            <h5 className="font-medium text-gray-900 mb-3">Navigation Tools</h5>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <ZoomIn className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">Zoom In - Magnify the image</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <ZoomOut className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">Zoom Out - Reduce image magnification</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Image className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">Pan - Alt/Option + Drag to move around the image</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How to Draw Prompts */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-4 text-lg">How to Draw Prompts</h4>
        
        {/* General Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h5 className="font-medium text-blue-900 mb-3">General Steps</h5>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">1</div>
              <div>
                <p className="text-blue-800 font-medium">Select a Label</p>
                <p className="text-blue-700 text-sm">Choose the appropriate label (e.g., "Coral" or "Petri Dish") from the label selector before drawing prompts.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">2</div>
              <div>
                <p className="text-blue-800 font-medium">Choose Drawing Tool</p>
                <p className="text-blue-700 text-sm">Select the appropriate tool based on your annotation needs.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">3</div>
              <div>
                <p className="text-blue-800 font-medium">Run Segmentation</p>
                <p className="text-blue-700 text-sm">Click "Segment Object" to process your prompts with the selected AI model, or enable "Instant Segmentation" for real-time results.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tool-Specific Instructions */}
        <div className="space-y-6">
          <div className="border border-gray-200 rounded-lg p-6">
            <h5 className="font-medium text-gray-900 mb-4 flex items-center">
              <Crosshair className="w-5 h-5 text-blue-600 mr-2" />
              Point Tool Instructions
            </h5>
            <div className="space-y-3 text-sm text-gray-700">
              <p><strong>Purpose:</strong> Add precise annotation points to guide AI segmentation</p>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium text-gray-900 mb-2">How to use:</p>
                <ul className="space-y-1">
                  <li>• <strong>Left Click:</strong> Add positive points (mark areas to include in segmentation)</li>
                  <li>• <strong>Right Click:</strong> Add negative points (mark areas to exclude from segmentation)</li>
                  <li>• Click multiple times to add several points for better guidance</li>
                  <li>• Points appear as colored dots on the image</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-6">
            <h5 className="font-medium text-gray-900 mb-4 flex items-center">
              <Square className="w-5 h-5 text-green-600 mr-2" />
              Rectangle Tool Instructions
            </h5>
            <div className="space-y-3 text-sm text-gray-700">
              <p><strong>Purpose:</strong> Create rectangular bounding boxes for quick object selection</p>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium text-gray-900 mb-2">How to use:</p>
                <ul className="space-y-1">
                  <li>• <strong>Click and Drag:</strong> Draw a rectangle around the object you want to segment</li>
                  <li>• <strong>Release:</strong> The rectangle becomes a prompt for the AI</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-6">
            <h5 className="font-medium text-gray-900 mb-4 flex items-center">
              <Pentagon className="w-5 h-5 text-purple-600 mr-2" />
              Polygon Tool Instructions
            </h5>
            <div className="space-y-3 text-sm text-gray-700">
              <p><strong>Purpose:</strong> Create custom polygon shapes for precise object boundaries</p>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium text-gray-900 mb-2">How to use:</p>
                <ul className="space-y-1">
                  <li>• <strong>Click:</strong> Add points to define the polygon shape</li>
                  <li>• <strong>Double-click:</strong> Complete the polygon and finish drawing</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-4 text-lg">Action Buttons</h4>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                <Eraser className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Clear</p>
                <p className="text-sm text-gray-600">Remove all current prompts and start over</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                <Play className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Segment Object</p>
                <p className="text-sm text-gray-600">Process prompts with the selected AI model</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Finish Mask</p>
                <p className="text-sm text-gray-600">Save the current segmentation mask</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Next</p>
                <p className="text-sm text-gray-600">Move to the next image in the dataset</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Panel */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-4 text-lg">Results Panel</h4>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h5 className="font-medium text-gray-900 mb-2">Segmentation Results</h5>
            <p className="text-sm text-gray-600 mb-3">Shows manual contours and AI-generated segmentation masks</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Displays count of manual contours</li>
              <li>• Shows "No results yet" when no segmentation has been performed</li>
              <li>• Prompts to run AI segmentation or draw manual contours</li>
            </ul>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <h5 className="font-medium text-gray-900 mb-2">Final Mask</h5>
            <p className="text-sm text-gray-600 mb-3">Displays the final segmented image with applied masks</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Shows contour count for the current image</li>
              <li>• Displays green segmentation masks over coral regions</li>
              <li>• Provides visual confirmation of segmentation accuracy</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tips and Best Practices */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h4 className="font-semibold text-yellow-900 mb-3">Tips & Best Practices</h4>
        <div className="space-y-2 text-sm text-yellow-800">
          <p>• <strong>Always select a label</strong> before drawing prompts to avoid the warning message</p>
          <p>• <strong>Use positive and negative prompts</strong> to guide the AI more accurately</p>
          <p>• <strong>Start with point prompts</strong> for quick initial segmentation, then refine with polygons</p>
          <p>• <strong>Enable Instant Segmentation</strong> for real-time feedback on your prompts</p>
          <p>• <strong>Use the pan and zoom tools</strong> to work with high-resolution images effectively</p>
        </div>
      </div>
    </div>
  );
};

export default AnnotationSection; 