import React from 'react';
import { Typography } from "@mui/material";
import QuantificationTable from './QuantificationTable';

//REFACTOR: This isnt used anywhere, can be deleted
const QuantificationPanel = ({ segmentationMasks }) => {
  return (
    <div style={{ marginTop: 24 }}>
      <Typography variant="h6">Quantification</Typography>
      <QuantificationTable masks={segmentationMasks.length > 0 ? segmentationMasks : []} />
    </div>
  );
};

export default QuantificationPanel; 