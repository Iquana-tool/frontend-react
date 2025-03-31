# Coral Segmentation Frontend

This is the frontend application for the Coral Segmentation project. It provides an interactive interface for segmenting coral images using the SAM2 model.

## Features

- Upload and manage coral images
- Interactive segmentation tools (point, box, circle, polygon)
- Foreground/background prompting
- Image zoom and pan controls
- Save and refine segmentation masks
- Integration with SAM2 segmentation backend

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Backend server running (see backend setup)

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd coral-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure API endpoint**
   
   Edit `src/api.js` to point to your backend server:
   ```javascript
   const API_BASE_URL = 'http://localhost:8000';
   ```

4. **Start the development server**
   ```bash
   npm start
   # or
   yarn start
   ```

5. **Build for production**
   ```bash
   npm run build
   # or
   yarn build
   ```

## Backend Integration

This frontend is designed to work with the FastAPI backend for coral segmentation. Make sure the backend server is running before using the frontend application.

### Backend API Endpoints Used

- `/images/upload_image` - Upload a new image
- `/images/list_images` - Get all available images
- `/images/get_image/{image_id}` - Get a specific image
- `/images/delete_image/{image_id}` - Delete an image
- `/segmentation/segment_image` - Perform segmentation with optional prompts
- `/masks/save_mask` - Save a segmentation mask
- `/masks/get_mask/{mask_id}` - Get a specific mask
- `/masks/get_masks_for_image/{image_id}` - Get all masks for an image
- `/masks/delete_mask/{mask_id}` - Delete a mask
- `/cutouts/get_cutouts` - Get cutouts based on masks

## Usage

1. **Upload an image** by dragging and dropping or using the file selector
2. **Select segmentation tools** from the toolbar
3. **Add prompts** to indicate foreground (green) or background (red)
4. **Click "Start Segmentation"** to process the image
5. **Review the segments** that appear in the results section
6. **Refine segments** by selecting and using the refine button
7. **Save masks** to the database for future use

## Components

- **ImageViewerWithPrompting** - Main component for image viewing and interaction
- **PromptingCanvas** - Canvas for adding segmentation prompts
- **API** - Handles communication with the backend

## Advanced Features

### Model Selection

The application supports different SAM2 models:
- SAM2 Tiny (fast but less accurate)
- SAM2 Small (balanced)
- SAM2 Large (more accurate but slower)
- SAM2 Base Plus (enhanced version)

### Refinement Mode

To refine a segment:
1. Select a segmentation result
2. Click "Refine Selected Segment"
3. Add additional prompts in the refinement view
4. Click "Start Segmentation"
5. Return to the full image view to see the updated segment

## Troubleshooting

- **Image fails to load**: Ensure the backend is running and the image exists
- **Segmentation fails**: Check console for errors and ensure your backend has the proper SAM2 models installed
- **Slow performance**: Try using the SAM2 Tiny model for faster results

## Development

### Directory Structure

```
src/
├── api.js          # API functions for backend communication
├── App.jsx         # Main application component
├── components/
│   └── prompting/  # Segmentation components
│       ├── ImageViewerWithPrompting.jsx
│       ├── PromptingCanvas.jsx
│       ├── index.js
│       └── utils.js
├── sampleImages.js # Sample images for development
└── index.js        # Entry point
```
