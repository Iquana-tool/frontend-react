const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "https://coral.ni.dfki.de/api";

export const DownloadQuantifications = async (dataset_id) => {
    try {
        return await fetch(
            `${API_BASE_URL}/export/get_dataset_csv/${dataset_id}&include_manual=true&include_auto=false`,
        );
    } catch (e) {
        console.error(e)
    }
}

export const DownloadImageDataset = async (dataset_id) => {
    try {
        return await fetch(
            `${API_BASE_URL}/export/get_segmentation_dataset/${dataset_id}&include_manual=true&include_auto=false`,
        );
    } catch (e) {
        console.error(e)
    }
}