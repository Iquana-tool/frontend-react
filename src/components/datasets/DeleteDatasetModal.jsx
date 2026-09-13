import React from 'react';
import { Trash2 } from 'lucide-react';
import { useDeleteConfirmText, useModalActions } from '../../stores/selectors';

const DeleteDatasetModal = ({ 
  isOpen, 
  dataset, 
  onConfirm, 
  onCancel, 
  isDeleting = false 
}) => {
 
  const deleteConfirmText = useDeleteConfirmText();
  const { setDeleteConfirmText, clearDeleteConfirmText } = useModalActions();

  if (!isOpen || !dataset) return null;

  const handleConfirm = () => {
    if (deleteConfirmText === 'DELETE') {
      onConfirm();
    }
  };

  const handleCancel = () => {
    clearDeleteConfirmText();
    onCancel();
  };

  const isConfirmDisabled = deleteConfirmText !== 'DELETE' || isDeleting;

  return (
    <div className="fixed inset-0 bg-scrim flex items-center justify-center z-50 p-4">
      <div className="bg-p1 rounded-xl shadow-2xl max-w-md w-full mx-auto">
        {/* Modal Header */}
        <div className="bg-err text-onAccent p-6 rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-hv rounded-full">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Delete Dataset</h3>
              <p className="text-t2 text-sm">This action cannot be undone</p>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          <p className="text-t2 mb-4">
            Are you sure you want to delete the dataset{" "}
            <span className="font-semibold">"{dataset.name}"</span>?
          </p>
          
          <div className="bg-errBg border border-errLn rounded-lg p-4 mb-6">
            <p className="text-err font-medium mb-2">This will permanently remove:</p>
            <ul className="text-err text-sm space-y-1">
              <li>• All images in the dataset</li>
              <li>• All annotations and masks</li>
              <li>• All labels and quantifications</li>
              <li>• All associated data files</li>
            </ul>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-t2 mb-2">
              Type <code className="bg-well px-2 py-1 rounded text-err font-mono">DELETE</code> to confirm:
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-ln2 rounded-lg focus:ring-2 focus:ring-err focus:border-err"
              placeholder="Type DELETE here"
              autoFocus
            />
          </div>

          {/* Modal Actions */}
          <div className="flex space-x-3">
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-2 border border-ln2 text-t2 rounded-lg hover:bg-hv transition-colors"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isConfirmDisabled}
              className="flex-1 px-4 py-2 bg-err text-onAccent rounded-lg hover:brightness-110 disabled:bg-ln2 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-onAccent"></div>
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Dataset</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteDatasetModal; 