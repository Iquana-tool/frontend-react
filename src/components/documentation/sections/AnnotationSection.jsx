import React from "react";
import {Crosshair, Square, Eraser, Check, Focus, Edit } from "lucide-react";

const AnnotationSection = () => {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-t1 mb-3">Annotation Interface Overview</h3>
        <p className="text-t2 mb-4">
          The IQuana annotation interface provides a comprehensive set of features for marking, 
          segmenting, and analyzing coral regions in your images. The sidebar allows you to select 
          models for prompted segmentation and suggestion segmentation. You can use point and box 
          prompts to guide AI segmentation, manage objects with a review workflow, and use advanced 
          features like focus mode and refinement mode for precise annotation.
        </p>
      </div>



      {/* Model Selection */}
      <div>
        <h4 className="font-semibold text-t1 mb-4 text-lg">Model Selection</h4>
        <div className="bg-acS border border-acLn rounded-lg p-6 mb-6">
          <p className="text-ac text-sm mb-4">
            The sidebar provides model selectors for different segmentation types. Simply choose the desired model from the dropdown menus.
          </p>
          <div className="space-y-4">
            <div className="bg-p1 p-4 rounded-lg">
              <h5 className="font-medium text-t1 mb-2">AI Segmentation Model</h5>
              <p className="text-sm text-t2">
                Select a model for prompted segmentation. This model will be used when you add point or box prompts to segment objects.
              </p>
            </div>
            <div className="bg-p1 p-4 rounded-lg">
              <h5 className="font-medium text-t1 mb-2">Suggestion Model</h5>
              <p className="text-sm text-t2">
                Select a model for suggestion segmentation. This model automatically detects new objects based on existing annotations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How to Draw Prompts */}
      <div>
        <h4 className="font-semibold text-t1 mb-4 text-lg">How to Draw Prompts</h4>
        
        {/* General Steps */}
        <div className="bg-acS border border-acLn rounded-lg p-6 mb-6">
          <h5 className="font-medium text-ac mb-3">General Steps</h5>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-accent text-onAccent rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">1</div>
              <div>
                <p className="text-ac font-medium">Select Model</p>
                <p className="text-ac text-sm">Choose the desired AI Segmentation Model from the sidebar dropdown for prompted segmentation, or select a Suggestion Model for suggestion segmentation.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-accent text-onAccent rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">2</div>
              <div>
                <p className="text-ac font-medium">Draw Prompts</p>
                <p className="text-ac text-sm">Add point prompts (left-click for positive, right-click for negative) or box prompts (click and drag) to guide the AI segmentation.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-accent text-onAccent rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">3</div>
              <div>
                <p className="text-ac font-medium">Run Segmentation</p>
                <p className="text-ac text-sm">Enable "Instant Prompted Segmentation" for automatic segmentation when prompts are added, or click "Run AI Segmentation" button to process manually.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-accent text-onAccent rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">4</div>
              <div>
                <p className="text-ac font-medium">Assign Label</p>
                <p className="text-ac text-sm">After the object is created, click "Accept" on the unreviewed object to assign a label. The object will then move to the reviewed section.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tool-Specific Instructions */}
        <div className="space-y-6">
          <div className="border border-ln rounded-lg p-6">
            <h5 className="font-medium text-t1 mb-4 flex items-center">
              <Crosshair className="w-5 h-5 text-ac mr-2" />
              Point Tool Instructions
            </h5>
            <div className="space-y-3 text-sm text-t2">
              <p><strong>Purpose:</strong> Add precise annotation points to guide AI segmentation</p>
              <div className="bg-well p-3 rounded-lg">
                <p className="font-medium text-t1 mb-2">How to use:</p>
                <ul className="space-y-1">
                  <li>• <strong>Left Click:</strong> Add positive points (mark areas to include in segmentation)</li>
                  <li>• <strong>Right Click:</strong> Add negative points (mark areas to exclude from segmentation)</li>
                  <li>• Click multiple times to add several points for better guidance</li>
                  <li>• Points appear as colored dots on the image</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border border-ln rounded-lg p-6">
            <h5 className="font-medium text-t1 mb-4 flex items-center">
              <Square className="w-5 h-5 text-ok mr-2" />
              Box Prompt Instructions
            </h5>
            <div className="space-y-3 text-sm text-t2">
              <p><strong>Purpose:</strong> Create rectangular bounding boxes for quick object selection</p>
              <div className="bg-well p-3 rounded-lg">
                <p className="font-medium text-t1 mb-2">How to use:</p>
                <ul className="space-y-1">
                  <li>• <strong>Click and Drag:</strong> Draw a rectangle around the object you want to segment</li>
                  <li>• <strong>Release:</strong> The rectangle becomes a box prompt for the AI</li>
                  <li>• Only the last box prompt is used if multiple boxes are drawn</li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Focus Mode */}
      <div>
        <h4 className="font-semibold text-t1 mb-4 text-lg">Focus Mode</h4>
        <div className="bg-okBg border border-okLn rounded-lg p-6">
          <div className="flex items-center mb-3">
            <Focus className="w-5 h-5 text-ok mr-2" />
            <h5 className="font-medium text-ok">What is Focus Mode?</h5>
          </div>
          <p className="text-ok text-sm mb-4">
            Focus Mode allows you to concentrate on a single object by dimming everything else. 
            This is especially useful for precise annotation within object boundaries.
          </p>
          <div className="space-y-3">
            <div className="bg-p1 p-3 rounded-lg">
              <p className="font-medium text-t1 mb-2">How to enter Focus Mode:</p>
              <ul className="text-sm text-t2 space-y-1">
                <li>• <strong>Single-click</strong> an object in the objects list</li>
                <li>• The view automatically zooms and centers on the selected object</li>
                <li>• Everything except the focused object is dimmed</li>
              </ul>
            </div>
            <div className="bg-p1 p-3 rounded-lg">
              <p className="font-medium text-t1 mb-2">Using Focus Mode:</p>
              <ul className="text-sm text-t2 space-y-1">
                <li>• Add prompts within the focused object using point or box prompts</li>
                <li>• Point and box prompts are constrained to the focused object's boundary</li>
                <li>• Prompts outside the boundary will show a warning</li>
              </ul>
            </div>
            <div className="bg-p1 p-3 rounded-lg">
              <p className="font-medium text-t1 mb-2">Exiting Focus Mode:</p>
              <ul className="text-sm text-t2 space-y-1">
                <li>• Click the <strong>"Exit Focus"</strong> button in the top-right corner</li>
                <li>• Press <strong>ESC</strong> key</li>
                <li>• Click another object or deselect the current object</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Refinement Mode */}
      <div>
        <h4 className="font-semibold text-t1 mb-4 text-lg">Refinement Mode</h4>
        <div className="bg-acS border border-acLn rounded-lg p-6">
          <div className="flex items-center mb-3">
            <Edit className="w-5 h-5 text-ac mr-2" />
            <h5 className="font-medium text-ac">What is Refinement Mode?</h5>
          </div>
          <p className="text-ac text-sm mb-4">
            Refinement Mode allows you to improve existing segmentations by adding new prompts 
            to refine the object's boundaries. The AI will update the existing object instead of creating a new one.
          </p>
          <div className="space-y-3">
            <div className="bg-p1 p-3 rounded-lg">
              <p className="font-medium text-t1 mb-2">How to enter Refinement Mode:</p>
              <ul className="text-sm text-t2 space-y-1">
                <li>• <strong>Double-click</strong> an object in the objects list</li>
                <li>• The view automatically zooms and centers on the object</li>
                <li>• The object is selected for refinement</li>
              </ul>
            </div>
            <div className="bg-p1 p-3 rounded-lg">
              <p className="font-medium text-t1 mb-2">Refining Objects:</p>
              <ul className="text-sm text-t2 space-y-1">
                <li>• Add point or box prompts to guide the refinement</li>
                <li>• Run segmentation (manually or with instant segmentation)</li>
                <li>• The existing object will be updated with the refined boundaries</li>
                <li>• Refinement mode automatically exits after successful segmentation</li>
              </ul>
            </div>
            <div className="bg-p1 p-3 rounded-lg">
              <p className="font-medium text-t1 mb-2">Exiting Refinement Mode:</p>
              <ul className="text-sm text-t2 space-y-1">
                <li>• Click the <strong>"Exit Refinement"</strong> button in the top-right corner</li>
                <li>• Press <strong>ESC</strong> key</li>
                <li>• Refinement mode automatically exits after successful segmentation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Instant Segmentation */}
      <div>
        <h4 className="font-semibold text-t1 mb-4 text-lg">Instant Prompted Segmentation</h4>
        <div className="bg-acS border border-acLn rounded-lg p-6">
          <p className="text-ac text-sm mb-4">
            When enabled, segmentation automatically triggers whenever you add a prompt (point or box). 
            This provides real-time feedback and speeds up the annotation workflow.
          </p>
          <div className="bg-p1 p-3 rounded-lg">
            <p className="font-medium text-t1 mb-2">How to enable:</p>
            <ul className="text-sm text-t2 space-y-1">
              <li>• Toggle <strong>"Instant Prompted Segmentation"</strong> in the sidebar</li>
              <li>• When enabled, the "Run AI Segmentation" button is hidden (segmentation happens automatically)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Object Management */}
      <div>
        <h4 className="font-semibold text-t1 mb-4 text-lg">Object Management & Review Workflow</h4>
        <div className="space-y-4">
          <div className="border border-ln rounded-lg p-6">
            <h5 className="font-medium text-t1 mb-3">Objects Organization</h5>
            <p className="text-sm text-t2 mb-4">
              Objects are automatically organized into two sections:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-acS p-4 rounded-lg border border-acLn">
                <h6 className="font-semibold text-ac mb-2">Unreviewed Objects</h6>
                <p className="text-sm text-ac">
                  Newly created objects that haven't been reviewed yet. These appear in the purple section.
                </p>
              </div>
              <div className="bg-acS p-4 rounded-lg border border-acLn">
                <h6 className="font-semibold text-ac mb-2">Reviewed Objects</h6>
                <p className="text-sm text-ac">
                  Objects that have been marked as reviewed. These appear in the teal section and are sorted with labeled objects first.
                </p>
              </div>
            </div>
          </div>

          <div className="border border-ln rounded-lg p-6">
            <h5 className="font-medium text-t1 mb-3">Object Actions</h5>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 bg-well rounded-lg">
                <Check className="w-4 h-4 text-ok mt-0.5" />
                <div>
                  <p className="font-medium text-t1">Accept Object</p>
                  <p className="text-sm text-t2">Assign a label to an unreviewed object (labels are assigned after annotation, not before). The object moves to reviewed status.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-well rounded-lg">
                <Eraser className="w-4 h-4 text-err mt-0.5" />
                <div>
                  <p className="font-medium text-t1">Reject Object</p>
                  <p className="text-sm text-t2">Delete an unreviewed object that doesn't meet quality standards</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-well rounded-lg">
                <Edit className="w-4 h-4 text-ac mt-0.5" />
                <div>
                  <p className="font-medium text-t1">Edit Object</p>
                  <p className="text-sm text-t2">Manually edit the contour points of an existing object</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-well rounded-lg">
                <Check className="w-4 h-4 text-ac mt-0.5" />
                <div>
                  <p className="font-medium text-t1">Mark as Reviewed</p>
                  <p className="text-sm text-t2">Approve an object (available once the image's Annotate phase is finished)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-ln rounded-lg p-6">
            <h5 className="font-medium text-t1 mb-3">Selection & Navigation</h5>
            <div className="space-y-2 text-sm text-t2">
              <p>• <strong>Single-click</strong> an object to select it and enter focus mode</p>
              <p>• <strong>Double-click</strong> an object to enter refinement mode</p>
              <p>• <strong>Shift + Click</strong> to select multiple objects (multi-select)</p>
              <p>• Selected objects are highlighted and can be managed together</p>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div>
        <h4 className="font-semibold text-t1 mb-4 text-lg">Keyboard Shortcuts</h4>
        <div className="border border-ln rounded-lg p-6 bg-well">
          <div className="space-y-2 text-sm text-t2">
            <p><kbd className="px-1.5 py-0.5 bg-p1 border border-ln2 rounded text-xs font-mono">Enter</kbd> — Run / confirm (e.g. run AI segmentation when prompts are present)</p>
            <p><kbd className="px-1.5 py-0.5 bg-p1 border border-ln2 rounded text-xs font-mono">1</kbd> — Run Prompted Segmentation</p>
            <p><kbd className="px-1.5 py-0.5 bg-p1 border border-ln2 rounded text-xs font-mono">2</kbd> — Run Instance Suggestion (with selected objects as seeds)</p>
            <p><kbd className="px-1.5 py-0.5 bg-p1 border border-ln2 rounded text-xs font-mono">3</kbd> — Open Instance Segmentation (warning modal)</p>
            <p><kbd className="px-1.5 py-0.5 bg-p1 border border-ln2 rounded text-xs font-mono">Delete</kbd> — Reject selected object(s), or remove last prompt in AI tool</p>
            <p><kbd className="px-1.5 py-0.5 bg-p1 border border-ln2 rounded text-xs font-mono">←</kbd> <kbd className="px-1.5 py-0.5 bg-p1 border border-ln2 rounded text-xs font-mono">→</kbd> — Previous / next image</p>
          </div>
        </div>
      </div>

      {/* Tips and Best Practices */}
      <div className="bg-warnBg border border-warnLn rounded-lg p-6">
        <h4 className="font-semibold text-warn mb-3">Tips & Best Practices</h4>
        <div className="space-y-2 text-sm text-warn">
          <p>• <strong>Use keyboard shortcuts</strong> (Enter, 1–3, Delete, arrow keys) for faster annotation</p>
          <p>• <strong>Labels are assigned after annotation</strong> - draw prompts and create objects first, then accept and assign labels</p>
          <p>• <strong>Use positive and negative point prompts</strong> (left-click for positive, right-click for negative) to guide the AI more accurately</p>
          <p>• <strong>Use box prompts</strong> (click and drag) for quick bounding box selection</p>
          <p>• <strong>Enable Instant Prompted Segmentation</strong> for real-time feedback and faster workflow</p>
          <p>• <strong>Use Focus Mode</strong> for precise annotation within object boundaries</p>
          <p>• <strong>Use Refinement Mode</strong> (double-click object) to improve existing segmentations</p>
          <p>• <strong>Review and organize objects</strong> by accepting/rejecting and marking as reviewed</p>
          <p>• <strong>Use multi-select</strong> (Shift + Click) to manage multiple objects at once</p>
          <p>• <strong>Pan and zoom</strong> are automatically handled in focus and refinement modes</p>
        </div>
      </div>
    </div>
  );
};

export default AnnotationSection; 