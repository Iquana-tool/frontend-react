import React, { useEffect, useState } from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, CircularProgress } from '@mui/material';
import * as api from '../api';

const QuantificationTable = ({ masks }) => {
  const [quantRows, setQuantRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchQuantifications = async () => {
      setLoading(true);
      const allRows = [];
      if (masks && masks.length > 0) {
        for (let maskIdx = 0; maskIdx < masks.length; maskIdx++) {
          const mask = masks[maskIdx];
          try {
            const quantResult = await api.getQuantification(mask.id);
            if (quantResult && quantResult.quantifications) {
              // If quantifications is an array (per contour), flatten them
              const quantArr = Array.isArray(quantResult.quantifications)
                ? quantResult.quantifications
                : [quantResult.quantifications];
              quantArr.forEach((q, contourIdx) => {
                allRows.push({
                  mask: maskIdx + 1,
                  contour: contourIdx + 1,
                  ...q
                });
              });
            }
          } catch (err) {
            // Ignore errors for individual masks
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

  if (loading) {
    return <CircularProgress sx={{ mt: 2 }} />;
  }

  if (!quantRows.length) {
    return (
      <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
        Quantification data will appear here. Please add an object, to begin!
      </Typography>
    );
  }

  // Get all unique quantification keys for columns
  const quantKeys = Array.from(new Set(quantRows.flatMap(row => Object.keys(row)))).filter(k => k !== 'mask' && k !== 'contour');

  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Mask</TableCell>
            <TableCell>Contour</TableCell>
            {quantKeys.map(key => (
              <TableCell key={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {quantRows.map((row, idx) => (
            <TableRow key={idx}>
              <TableCell>{row.mask}</TableCell>
              <TableCell>{row.contour}</TableCell>
              {quantKeys.map(key => (
                <TableCell key={key}>{row[key]}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default QuantificationTable; 