// Export utility functions for quantification data

export const exportQuantificationsAsCsv = (masks) => {
  if (!masks || masks.length === 0) return;

  // Prepare CSV header
  let csvContent = "ID,Label,Area,Perimeter,Circularity,Confidence\n";

  // Add data for each mask
  masks.forEach((mask, index) => {
    const q = mask.quantifications || {};
    const row = [
      index + 1,
      mask.label || "unlabeled",
      q.area?.toFixed(2) || 0,
      q.perimeter?.toFixed(2) || 0,
      q.circularity?.toFixed(2) || 0,
      (mask.quality * 100).toFixed(2) || 0,
    ].join(",");
    csvContent += row + "\n";
  });

  // Create and trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "quantifications.csv");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}; 