import React, { useEffect, useState } from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, CircularProgress, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import * as api from '../api';
import { getLabelColor, getLabelColorByName } from '../utils/labelColors';

const QuantificationTable = ({ masks, onContourSelect, onContourDelete }) => {
  const [quantRows, setQuantRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deletingContours, setDeletingContours] = useState(new Set());

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
              if (response && response.quantifications) {
                const quantificationData = response.quantifications;
                
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
              } else {
                console.warn(`No quantification data for mask ${mask.id}`);
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
        
        // Still call parent callback to update final mask viewer
        if (onContourDelete) {
          try {
            await onContourDelete(contourId);
          } catch (callbackError) {
            console.warn("Parent callback failed:", callbackError);
          }
        }
        
        alert('This contour was already deleted. The table has been updated.');
      } else {
        // Provide more specific error message
        const errorMessage = error.message || 'Unknown error occurred';
        alert(`Failed to delete contour: ${errorMessage}`);
      }
      
    } finally {
      setDeletingContours(prev => {
        const newSet = new Set(prev);
        newSet.delete(contourId);
        return newSet;
      });
    }
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

  // Get unique labels for legend
  const uniqueLabels = [...new Set(quantRows.map(row => row.label_name))].filter(Boolean);

  return (
    <div>
      {/* Color Legend */}
      {uniqueLabels.length > 1 && (
        <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#666', marginRight: 8 }}>Labels:</span>
          {uniqueLabels.map((label) => {
            const colors = getTableRowColors(label, null);
            const primaryColor = getLabelColorByName(label);
            return (
              <div
                key={label}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  backgroundColor: colors.backgroundColor,
                  color: colors.color,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  border: `1px solid ${primaryColor}40`
                }}
              >
                {label}
              </div>
            );
          })}
        </div>
      )}

      <TableContainer component={Paper} sx={{ mt: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {displayColumns.map((column) => (
                <TableCell key={column.id}>{column.label}</TableCell>
              ))}
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
        <TableBody>
          {quantRows.map((row, idx) => {
            const labelColors = getTableRowColors(row.label_name, row.label);
            const isDeleting = deletingContours.has(row.contour_id);
            
            return (
              <TableRow 
                key={idx}
                onClick={() => {
                  // Handle row click for zoom functionality
                  if (onContourSelect && row.contour_id && !isDeleting) {
                    onContourSelect(row);
                  }
                }}
                sx={{ 
                  backgroundColor: labelColors.backgroundColor,
                  cursor: onContourSelect && !isDeleting ? 'pointer' : 'default',
                  opacity: isDeleting ? 0.6 : 1,
                  '&:hover': { 
                    backgroundColor: labelColors.backgroundColor, 
                    opacity: isDeleting ? 0.6 : 0.8,
                    transform: onContourSelect && !isDeleting ? 'scale(1.02)' : 'none'
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
                title={onContourSelect && !isDeleting ? "Click to zoom to this contour" : ""}
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
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(event) => handleDeleteContour(row.contour_id, event)}
                    disabled={isDeleting}
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
    </div>
  );
};

export default QuantificationTable; 