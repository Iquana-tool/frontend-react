import React, { useEffect, useState } from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, CircularProgress, IconButton, Chip, Box } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import * as api from '../../../api';
import { getLabelColor, getLabelColorByName } from '../../../utils/labelColors';

const QuantificationTable = ({ masks, onContourSelect, onContourDelete }) => {
  const [quantRows, setQuantRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deletingContours, setDeletingContours] = useState(new Set());
  const [selectedContourId, setSelectedContourId] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState(new Set()); // Track selected label filters

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
      {uniqueLabelsWithIds.length > 1 && (
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