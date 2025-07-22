export const getContourLabelName = (contour, allContours, availableLabels, currentIndex) => {
  // Get the base label name by looking up in availableLabels
  let baseLabelName;
  if (contour.label_name) {
    baseLabelName = contour.label_name;
  } else if (contour.label && availableLabels.length > 0) {
    const labelInfo = availableLabels.find(label => label.id === contour.label);
    baseLabelName = labelInfo ? labelInfo.name : `Label ${contour.label}`;
  } else {
    baseLabelName = 'Unlabeled';
  }
  
  // Group contours by their base label name and count occurrences
  const contoursWithSameLabel = allContours.filter(c => {
    let cBaseLabelName;
    if (c.label_name) {
      cBaseLabelName = c.label_name;
    } else if (c.label && availableLabels.length > 0) {
      const labelInfo = availableLabels.find(label => label.id === c.label);
      cBaseLabelName = labelInfo ? labelInfo.name : `Label ${c.label}`;
    } else {
      cBaseLabelName = 'Unlabeled';
    }
    return cBaseLabelName === baseLabelName;
  });
  
  // If there's only one contour with this label, don't add a number
  if (contoursWithSameLabel.length === 1) {
    return baseLabelName;
  }
  
  // Find the position of current contour within contours of the same type
  const indexInGroup = contoursWithSameLabel.findIndex(c => c.id === contour.id) + 1;
  
  return `${baseLabelName} ${indexInGroup}`;
};

export const getManualContourLabelName = (contour, manualContours, availableLabels, index) => {
  let baseLabelName;
  if (contour.label && availableLabels.length > 0) {
    const labelInfo = availableLabels.find(label => label.id === contour.label);
    baseLabelName = labelInfo ? labelInfo.name : `Label ${contour.label}`;
  } else {
    baseLabelName = 'Manual Contour';
  }
  
  // Group manual contours by their base label name
  const contoursWithSameLabel = manualContours.filter(c => {
    let cBaseLabelName;
    if (c.label && availableLabels.length > 0) {
      const labelInfo = availableLabels.find(label => label.id === c.label);
      cBaseLabelName = labelInfo ? labelInfo.name : `Label ${c.label}`;
    } else {
      cBaseLabelName = 'Manual Contour';
    }
    return cBaseLabelName === baseLabelName;
  });
  
  if (contoursWithSameLabel.length === 1) {
    return baseLabelName;
  }
  
  const indexInGroup = contoursWithSameLabel.findIndex(c => c.id === contour.id) + 1;
  return `${baseLabelName} ${indexInGroup}`;
}; 