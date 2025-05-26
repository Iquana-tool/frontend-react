import React, { useEffect, useState } from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, CircularProgress } from '@mui/material';
import * as api from '../api';

const QuantificationTable = ({ masks }) => {
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
          } catch (err) {
            console.error(`Error fetching quantification for mask ${mask.id}:`, err);
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
    { id: 'mask_index', label: 'Mask', format: (value) => value },
    { id: 'contour_index', label: 'Contour', format: (value) => value },
    { id: 'label', label: 'Label', format: (value) => value },
    { id: 'area', label: 'Area', format: formatValue },
    { id: 'perimeter', label: 'Perimeter', format: formatValue },
    { id: 'circularity', label: 'Circularity', format: formatValue },
    { id: 'diameter_avg', label: 'Avg Diameter', format: formatValue },
    { id: 'diameter_min', label: 'Min Diameter', format: formatValue },
    { id: 'diameter_max', label: 'Max Diameter', format: formatValue }
  ];

  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {displayColumns.map((column) => (
              <TableCell key={column.id}>{column.label}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {quantRows.map((row, idx) => (
            <TableRow key={idx}>
              {displayColumns.map((column) => (
                <TableCell key={column.id}>
                  {column.format(row[column.id])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default QuantificationTable; 