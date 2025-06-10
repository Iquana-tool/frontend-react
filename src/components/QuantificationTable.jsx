import React, { useEffect, useState } from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, CircularProgress } from '@mui/material';
import * as api from '../api';

const QuantificationTable = ({ masks, onContourSelect }) => {
  const [quantRows, setQuantRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  // Format numeric values for display
  const formatValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return typeof value === 'number' ? value.toFixed(2) : value.toString();
  };

  // Get color for label type
  const getLabelColor = (labelName) => {
    if (!labelName) return { backgroundColor: '#f9f9f9', color: '#333' };
    
    const normalizedLabel = labelName.toLowerCase();
    
    // Check for hierarchical labels (Parent › Child format)
    if (normalizedLabel.includes('›')) {
      const parts = normalizedLabel.split('›').map(part => part.trim());
      const parentLabel = parts[0];
      const childLabel = parts[1];
      
      // Color based on parent class for consistency
      if (parentLabel.includes('coral')) {
        // Different shades for coral subclasses
        if (childLabel.includes('polyp')) {
          return { backgroundColor: '#f3e5f5', color: '#7b1fa2' }; // Light purple for coral polyp
        } else {
          return { backgroundColor: '#e3f2fd', color: '#1565c0' }; // Light blue for other coral types
        }
      } else if (parentLabel.includes('petri') || parentLabel.includes('dish')) {
        return { backgroundColor: '#fff8e1', color: '#f57c00' }; // Light yellow/orange for petri dish
      }
    }
    
    // Fallback to original logic for non-hierarchical labels
    if (normalizedLabel.includes('coral')) {
      return { backgroundColor: '#e3f2fd', color: '#1565c0' }; // Light blue for coral
    } else if (normalizedLabel.includes('petri') || normalizedLabel.includes('dish')) {
      return { backgroundColor: '#fff8e1', color: '#f57c00' }; // Light yellow/orange for petri dish
    } else if (normalizedLabel.includes('polyp')) {
      return { backgroundColor: '#f3e5f5', color: '#7b1fa2' }; // Light purple for polyp
    } else if (normalizedLabel.includes('algae')) {
      return { backgroundColor: '#e8f5e8', color: '#2e7d32' }; // Light green for algae
    } else {
      // Default colors for unknown labels
      const colors = [
        { backgroundColor: '#fce4ec', color: '#c2185b' }, // Light pink
        { backgroundColor: '#e0f2f1', color: '#00695c' }, // Light teal
        { backgroundColor: '#fff3e0', color: '#ef6c00' }, // Light orange
        { backgroundColor: '#f1f8e9', color: '#558b2f' }, // Light lime
      ];
      
      // Use a simple hash to consistently assign colors to labels
      const hash = labelName.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      
      return colors[Math.abs(hash) % colors.length];
    }
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
            const colors = getLabelColor(label);
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
                  border: `1px solid ${colors.color}20`
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
            </TableRow>
          </TableHead>
        <TableBody>
          {quantRows.map((row, idx) => {
            const labelColors = getLabelColor(row.label_name);
            return (
              <TableRow 
                key={idx}
                onClick={() => {
                  // Handle row click for zoom functionality
                  if (onContourSelect && row.contour_id) {
                    onContourSelect(row);
                  }
                }}
                sx={{ 
                  backgroundColor: labelColors.backgroundColor,
                  cursor: onContourSelect ? 'pointer' : 'default',
                  '&:hover': { 
                    backgroundColor: labelColors.backgroundColor, 
                    opacity: 0.8,
                    transform: onContourSelect ? 'scale(1.02)' : 'none'
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
                title={onContourSelect ? "Click to zoom to this contour" : ""}
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