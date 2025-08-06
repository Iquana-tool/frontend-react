import React, { useEffect, useState } from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, CircularProgress, IconButton, Chip, Box, Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemButton, ListItemText, ListItemIcon, Snackbar, Alert } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FilterListIcon from '@mui/icons-material/FilterList';
import * as api from '../../../api';
import { getLabelColor, getLabelColorByName } from '../../../utils/labelColors';
import { useDataset } from '../../../contexts/DatasetContext';
import {deleteAllContours} from "../../../api";
import {Loader2, Trash2} from "lucide-react";

const QuantificationTable = ({ masks, onContourSelect, onContourDelete, onLabelUpdate }) => {
  const [quantRows, setQuantRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deletingContours, setDeletingContours] = useState(new Set());
  const [selectedContourId, setSelectedContourId] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState(new Set()); // Track selected label filters
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Label editing state
  const [editingContourId, setEditingContourId] = useState(null);
  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const [availableLabels, setAvailableLabels] = useState([]);
  const [editingLabel, setEditingLabel] = useState(false);
  
  // Notification state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' // 'success', 'error', 'warning', 'info'
  });
  
  const { currentDataset } = useDataset();

  // Helper function to show notifications
  const showNotification = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  // Handle snackbar close
  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const response = await deleteAllContours(masks[0].id);
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  }

  useEffect(() => {
    let isMounted = true;
    const fetchQuantifications = async () => {
      setLoading(true);
      setError(null);
      const allRows = [];
      
      if (masks && masks.length > 0) {
        for (let maskIdx = 0; maskIdx < masks.length; maskIdx++) {
          const mask = masks[maskIdx];
          
          try {
            // Check if this is a finalMask with contours (new structure)
            if (mask.contours && Array.isArray(mask.contours)) {
              // Handle finalMask structure - contours are already loaded
              mask.contours.forEach((contour, contourIdx) => {
                if (contour && contour.area !== undefined) {
                  allRows.push({
                    mask_id: mask.id || mask.mask_id,
                    mask_index: maskIdx + 1,
                    contour_id: contour.id,
                    contour_index: contourIdx + 1,
                    label: contour.label,
                    label_name: contour.label_name || `Label ${contour.label}`,
                    area: contour.area,
                    perimeter: contour.perimeter,
                    circularity: contour.circularity,
                    diameters: contour.diameters,
                    diameter_min: contour.diameters && contour.diameters.length > 0 ? 
                      Math.min(...contour.diameters) : null,
                    diameter_max: contour.diameters && contour.diameters.length > 0 ? 
                      Math.max(...contour.diameters) : null,
                    diameter_avg: contour.diameters && contour.diameters.length > 0 ? 
                      contour.diameters.reduce((a, b) => a + b, 0) / contour.diameters.length : null
                  });
                }
              });
            } else {
              // Handle legacy segmentationMask structure - fetch from API
              const response = await api.getQuantification(mask.id);
              
              // Check if the response has the expected structure
              if (response && response.quantification) {
                const quantificationData = response.quantification;
                
                // Process each contour's quantification data
                quantificationData.forEach((quant, contourIdx) => {
                  if (quant) {
                    allRows.push({
                      mask_id: mask.id,
                      mask_index: maskIdx + 1,
                      contour_id: quant.id,
                      contour_index: contourIdx + 1,
                      label: quant.label,
                      label_name: `Label ${quant.label}`,
                      area: quant.area,
                      perimeter: quant.perimeter,
                      circularity: quant.circularity,
                      diameters: quant.diameters,
                      diameter_min: quant.diameters ? Math.min(...quant.diameters) : null,
                      diameter_max: quant.diameters ? Math.max(...quant.diameters) : null,
                      diameter_avg: quant.diameters ? 
                        quant.diameters.reduce((a, b) => a + b, 0) / quant.diameters.length : null
                    });
                  }
                });
              }
            }
          } catch (err) {
            console.error(`Error processing quantification for mask ${mask.id}:`, err);
            if (isMounted) {
              setError(`Failed to fetch quantification data: ${err.message}`);
            }
          }
        }
      }
      
      if (isMounted) {
        setQuantRows(allRows);
        setLoading(false);
      }
    };
    
    fetchQuantifications();
    return () => { isMounted = false; };
  }, [masks]);

  // Fetch available labels when component mounts or dataset changes
  useEffect(() => {
    const fetchLabels = async () => {
      if (!currentDataset) {
        setAvailableLabels([]);
        return;
      }

      try {
        const labels = await api.fetchLabels(currentDataset.id);
        setAvailableLabels(labels || []);
      } catch (err) {
        console.error("Error fetching labels:", err);
        setAvailableLabels([]);
      }
    };
    
    fetchLabels();
  }, [currentDataset]);

  // Handle delete contour
  const handleDeleteContour = async (contourId, event) => {
    // Stop event propagation to prevent row click
    event.stopPropagation();
    
    if (!contourId) {
      console.error("No contour ID provided for deletion");
      alert('Error: No contour ID provided');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this contour? This action cannot be undone.')) {
      return;
    }

    setDeletingContours(prev => new Set([...prev, contourId]));
    
    try {
      const response = await api.deleteContour(contourId);
      
      // Check if the response indicates success
      const isSuccess = response && (response.success === true);
      
      if (isSuccess) {
        // Remove the contour from local state immediately for UI responsiveness
        setQuantRows(prevRows => prevRows.filter(row => row.contour_id !== contourId));
        
        // Clear selection if the deleted contour was selected
        if (selectedContourId === contourId) {
          setSelectedContourId(null);
        }
        
        // Call parent callback if provided to handle final mask updates
        if (onContourDelete) {
          try {
            await onContourDelete(contourId);
          } catch (callbackError) {
            console.warn("Parent callback failed:", callbackError);
            // Don't throw here since the deletion was successful
          }
        }
        
      } else {
        // Handle error response
        const errorMessage = response.message || 'Unexpected response format';
        throw new Error(errorMessage);
      }
      
    } catch (error) {
      console.error('Error deleting contour:', {
        contourId,
        error: error.message
      });
      
      // Check if it's a "contour not found" error and handle gracefully
      if (error.message && (error.message.includes('Error deleting contour') || error.message.includes('not found'))) {
        // The contour might have been already deleted
        console.log("Contour was already deleted, removing from table");
        
        // Remove from local state anyway
        setQuantRows(prevRows => prevRows.filter(row => row.contour_id !== contourId));
        
        // Clear selection if the deleted contour was selected
        if (selectedContourId === contourId) {
          setSelectedContourId(null);
        }
        
        // Still call parent callback to update final mask viewer
        if (onContourDelete) {
          try {
            await onContourDelete(contourId);
          } catch (callbackError) {
            console.warn("Parent callback failed:", callbackError);
          }
        }
        
        showNotification('This contour was already deleted. The table has been updated.', 'info');
      } else {
        // Provide more specific error message
        const errorMessage = error.message || 'Unknown error occurred';
        showNotification(`Failed to delete contour: ${errorMessage}`, 'error');
      }
      
    } finally {
      setDeletingContours(prev => {
        const newSet = new Set(prev);
        newSet.delete(contourId);
        return newSet;
      });
    }
  };

  // Handle edit contour label
  const handleEditLabel = (contourId, event) => {
    // Stop event propagation to prevent row click
    event.stopPropagation();
    
    if (!contourId) {
      console.error("No contour ID provided for label editing");
      showNotification('Error: No contour ID provided', 'error');
      return;
    }
    
    setEditingContourId(contourId);
    setShowLabelDialog(true);
  };

  // Get the current label of the contour being edited
  const getCurrentContourLabel = () => {
    if (!editingContourId) return null;
    const currentRow = quantRows.find(row => row.contour_id === editingContourId);
    return currentRow ? currentRow.label : null;
  };

  // Get filtered available labels (excluding the current label)
  const getFilteredAvailableLabels = () => {
    const currentLabel = getCurrentContourLabel();
    if (currentLabel === null) return availableLabels;
    
    return availableLabels.filter(label => label.id !== currentLabel);
  };

  // Handle label selection and update
  const handleLabelSelect = async (newLabelId) => {
    if (!editingContourId || newLabelId === undefined) {
      return;
    }
    
    setEditingLabel(true);
    
    try {
      const response = await api.editContourLabel(editingContourId, newLabelId);
      
      if (response && response.success !== false) {
        // Update the local state to reflect the change
        const updatedRow = {
          ...quantRows.find(row => row.contour_id === editingContourId),
          label: newLabelId,
          label_name: availableLabels.find(label => label.id === newLabelId)?.name || `Label ${newLabelId}`
        };
        
        setQuantRows(prevRows => 
          prevRows.map(row => 
            row.contour_id === editingContourId ? updatedRow : row
          )
        );
        
        // Call parent callback if provided
        if (onLabelUpdate) {
          try {
            await onLabelUpdate(editingContourId, newLabelId, updatedRow);
          } catch (callbackError) {
            console.warn("Parent callback failed:", callbackError);
            // Don't throw here since the label update was successful
          }
        }
        
        // Show success message
        showNotification('Label updated successfully!', 'success');
      } else {
        throw new Error(response?.message || 'Failed to update label');
      }
    } catch (error) {
      console.error('Error updating contour label:', error);
      showNotification(`Failed to update label: ${error.message}`, 'error');
    } finally {
      setEditingLabel(false);
      setShowLabelDialog(false);
      setEditingContourId(null);
    }
  };

  // Get label name from id
  const getLabelName = (labelId) => {
    if (!labelId) return 'Unlabeled';
    
    const label = availableLabels.find(label => label.id === labelId);
    if (!label) return `Unknown (${labelId})`;
    
    return label.name;
  };

  // Format numeric values for display
  const formatValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return typeof value === 'number' ? value.toFixed(2) : value.toString();
  };

  // Get consistent color scheme for labels
  const getTableRowColors = (labelName, labelId) => {
    if (!labelName && !labelId) {
      return { backgroundColor: '#f9f9f9', color: '#333' };
    }
    
    // Use label ID if available, otherwise use label name
    let primaryColor, lightColor, darkColor;
    
    if (labelId) {
      primaryColor = getLabelColor(labelId);
      lightColor = getLabelColor(labelId, 'light');
      darkColor = getLabelColor(labelId, 'dark');
    } else {
      primaryColor = getLabelColorByName(labelName);
      lightColor = getLabelColorByName(labelName, 'light');
      darkColor = getLabelColorByName(labelName, 'dark');
    }
    
    return {
      backgroundColor: lightColor,
      color: darkColor,
      borderLeft: `4px solid ${primaryColor}`
    };
  };

  if (loading) {
    return <CircularProgress sx={{ mt: 2 }} />;
  }

  if (error) {
    return (
      <Typography variant="body2" color="error" sx={{ mt: 2 }}>
        {error}
      </Typography>
    );
  }

  if (!quantRows.length) {
    return (
      <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
        Quantification data will appear here. Please add an object, to begin!
      </Typography>
    );
  }

  // Define the columns we want to display and their order
  const displayColumns = [
    { id: 'contour_index', label: 'Contour', format: (value) => value },
    { id: 'label_name', label: 'Label', format: (value) => value },
    { id: 'area', label: 'Area', format: formatValue },
    { id: 'perimeter', label: 'Perimeter', format: formatValue },
    { id: 'circularity', label: 'Circularity', format: formatValue },
    { id: 'diameter_avg', label: 'Avg Diameter', format: formatValue },
    { id: 'diameter_min', label: 'Min Diameter', format: formatValue },
    { id: 'diameter_max', label: 'Max Diameter', format: formatValue }
  ];

  // Get unique labels for legend with their corresponding label IDs
  const uniqueLabelsWithIds = quantRows.reduce((acc, row) => {
    if (row.label_name && !acc.some(item => item.name === row.label_name)) {
      acc.push({ name: row.label_name, id: row.label });
    }
    return acc;
  }, []);

  // Filter rows based on selected labels
  const filteredRows = quantRows.filter(row => {
    if (selectedFilters.size === 0) {
      return true; // Show all rows when no filters are selected
    }
    return selectedFilters.has(row.label_name);
  });

  // Handle filter toggle
  const handleFilterToggle = (labelName) => {
    setSelectedFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(labelName)) {
        newFilters.delete(labelName);
      } else {
        newFilters.add(labelName);
      }
      return newFilters;
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedFilters(new Set());
  };

  // Select all filters
  const selectAllFilters = () => {
    const allLabels = uniqueLabelsWithIds.map(label => label.name);
    setSelectedFilters(new Set(allLabels));
  };

  return (
    <div>
      {/* Color Legend with Filter Controls */}
      {uniqueLabelsWithIds.length > 0 && (
        <Box sx={{ marginBottom: 2 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            overflowX: 'auto',
            overflowY: 'hidden',
            whiteSpace: 'nowrap',
            paddingBottom: 1,
            '&::-webkit-scrollbar': {
              height: 4
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: '#f1f1f1',
              borderRadius: 2
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#c1c1c1',
              borderRadius: 2,
              '&:hover': {
                backgroundColor: '#a8a8a8'
              }
            }
          }}>
            <FilterListIcon sx={{ fontSize: 16, color: '#666', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: '#666', flexShrink: 0 }}>Filter by Labels:</span>
            {uniqueLabelsWithIds.map((labelInfo) => {
              const colors = getTableRowColors(labelInfo.name, labelInfo.id);
              const primaryColor = labelInfo.id ? getLabelColor(labelInfo.id) : getLabelColorByName(labelInfo.name);
              const isSelected = selectedFilters.size === 0 || selectedFilters.has(labelInfo.name);
              const rowCount = quantRows.filter(row => row.label_name === labelInfo.name).length;
              const filteredCount = filteredRows.filter(row => row.label_name === labelInfo.name).length;
              
              return (
                <Chip
                  key={labelInfo.name}
                  label={`${labelInfo.name} (${filteredCount}/${rowCount})`}
                  onClick={() => handleFilterToggle(labelInfo.name)}
                  sx={{
                    backgroundColor: isSelected ? colors.backgroundColor : '#f5f5f5',
                    color: isSelected ? colors.color : '#666',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    border: `1px solid ${primaryColor}40`,
                    cursor: 'pointer',
                    opacity: isSelected ? 1 : 0.6,
                    flexShrink: 0,
                    '&:hover': {
                      backgroundColor: isSelected ? colors.backgroundColor : '#e0e0e0',
                      opacity: 1
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                />
              );
            })}
            {selectedFilters.size > 0 && (
              <Chip 
                label={`${filteredRows.length} of ${quantRows.length} items`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '10px', height: 20, flexShrink: 0 }}
              />
            )}
            <Box sx={{ marginLeft: 'auto', display: 'flex', gap: 1, flexShrink: 0 }}>
              <Chip 
                label="All"
                size="small"
                variant="outlined"
                onClick={selectAllFilters}
                sx={{ fontSize: '10px', height: 20, cursor: 'pointer' }}
              />
              <Chip 
                label="Clear"
                size="small"
                variant="outlined"
                onClick={clearAllFilters}
                sx={{ fontSize: '10px', height: 20, cursor: 'pointer' }}
              />
            </Box>
            <button
            className="w-auto flex items-center justify-center space-x-2 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm mt-3"
            onClick={handleDeleteAll}
        >
            {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin"/>
            ) : (
                <Trash2 className="w-4 h-4"/>
            )
            }
          <span>{isDeleting ? "Deleting" : "Delete all contours"}</span>
      </button>
          </Box>
        </Box>
      )}

      <TableContainer 
        component={Paper} 
        sx={{ 
          mt: 1,
          maxHeight: 400,
          overflow: 'auto'
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {displayColumns.map((column) => (
                <TableCell key={column.id}>{column.label}</TableCell>
              ))}
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
        <TableBody>
          {filteredRows.map((row, idx) => {
            const labelColors = getTableRowColors(row.label_name, row.label);
            const isDeleting = deletingContours.has(row.contour_id);
            
            return (
              <TableRow 
                key={idx}
                onClick={() => {
                  // Handle row click for zoom functionality
                  if (onContourSelect && row.contour_id && !isDeleting) {
                    if (selectedContourId === row.contour_id) {
                      // Toggle off - zoom out and deselect
                      setSelectedContourId(null);
                      onContourSelect(null); // Signal to parent to zoom out
                    } else {
                      // Select new contour - zoom to it
                      setSelectedContourId(row.contour_id);
                      onContourSelect(row);
                    }
                  }
                }}
                sx={{ 
                  backgroundColor: selectedContourId === row.contour_id ? 
                    `${labelColors.backgroundColor}dd` : labelColors.backgroundColor,
                  cursor: onContourSelect && !isDeleting ? 'pointer' : 'default',
                  opacity: isDeleting ? 0.6 : 1,
                  border: selectedContourId === row.contour_id ? 
                    `2px solid ${getLabelColor(row.label) || '#1976d2'}` : 'none',
                  '&:hover': { 
                    backgroundColor: labelColors.backgroundColor, 
                    opacity: isDeleting ? 0.6 : 0.8,
                    transform: onContourSelect && !isDeleting ? 'scale(1.02)' : 'none'
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
                title={onContourSelect && !isDeleting ? 
                  (selectedContourId === row.contour_id ? 
                    "Click to zoom out" : "Click to zoom to this contour") : ""}
              >
                {displayColumns.map((column) => (
                  <TableCell 
                    key={column.id}
                    sx={{ 
                      color: labelColors.color,
                      fontWeight: column.id === 'label_name' ? 'bold' : 'normal'
                    }}
                  >
                    {column.format(row[column.id])}
                  </TableCell>
                ))}
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={(event) => handleEditLabel(row.contour_id, event)}
                      disabled={isDeleting || editingLabel}
                      title="Edit label"
                      sx={{ 
                        color: '#3b82f6',
                        '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
                        '&:disabled': { color: '#9ca3af' }
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(event) => handleDeleteContour(row.contour_id, event)}
                      disabled={isDeleting || editingLabel}
                      title="Delete contour"
                      sx={{ 
                        color: '#dc2626',
                        '&:hover': { backgroundColor: 'rgba(220, 38, 38, 0.1)' },
                        '&:disabled': { color: '#9ca3af' }
                      }}
                    >
                      {isDeleting ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <DeleteIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>

    {/* Label Selection Dialog */}
    <Dialog 
      open={showLabelDialog} 
      onClose={() => setShowLabelDialog(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Select New Label for Contour
        {getCurrentContourLabel() && (
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1, fontWeight: 'normal' }}>
            Current label: {getLabelName(getCurrentContourLabel())}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        {availableLabels.length === 0 ? (
          <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
            No labels available. Please create labels in the dataset settings first.
          </Typography>
        ) : getFilteredAvailableLabels().length === 0 ? (
          <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
            No other labels available to change to. The current label is the only option.
          </Typography>
        ) : (
          <List sx={{ pt: 0 }}>
            {getFilteredAvailableLabels().map((label) => (
              <ListItem key={label.id} disablePadding>
                <ListItemButton 
                  onClick={() => handleLabelSelect(label.id)}
                  disabled={editingLabel}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'rgba(59, 130, 246, 0.1)'
                    }
                  }}
                >
                  <ListItemIcon>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        backgroundColor: getLabelColor(label.id),
                        border: '2px solid #fff',
                        boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText 
                    primary={label.name}
                    secondary={label.parent_id ? `Subclass of ${availableLabels.find(l => l.id === label.parent_id)?.name || 'Unknown'}` : 'Main class'}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={() => setShowLabelDialog(false)}
          disabled={editingLabel}
        >
          Cancel
        </Button>
        {editingLabel && (
          <CircularProgress size={20} sx={{ mr: 1 }} />
        )}
      </DialogActions>
    </Dialog>

    {/* Notification Snackbar */}
    <Snackbar
      open={snackbar.open}
      autoHideDuration={3000}
      onClose={handleSnackbarClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert 
        onClose={handleSnackbarClose} 
        severity={snackbar.severity}
        variant="filled"
        sx={{ 
          width: '100%',
          '& .MuiAlert-message': {
            fontSize: '14px',
            fontWeight: 500
          }
        }}
      >
        {snackbar.message}
      </Alert>
    </Snackbar>
    </div>
  );
};

export default QuantificationTable; 