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

- **AnnotationPage** - Main component for image viewing and interaction
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
│       ├── AnnotationPage.jsx
│       ├── PromptingCanvas.jsx
│       ├── index.js
│       └── utils.js
├── sampleImages.js # Sample images for development
└── index.js        # Entry point
```

## CI/CD Pipeline

This project uses GitHub Actions for Continuous Integration and Continuous Deployment.

### Workflow Overview

The CI/CD pipeline consists of four main jobs:

1. **Build and Test**
   - Checkout code
   - Set up Node.js environment
   - Install dependencies
   - Run linting checks
   - Run tests
   - Build the application
   - Upload build artifacts

2. **Docker Build**
   - Builds a Docker image for the application
   - Pushes the image to Docker Hub with appropriate tags
   - Uses build caching for faster builds
   - Comments on pull requests with Docker image information
   - Runs only on pushes to main and development branches

3. **Staging Deployment** (for development branch)
   - Connects to the staging server via SSH
   - Deploys the latest development image
   - Uses environment variables for flexibility
   - Runs container on port 3001

4. **Production Deployment** (for main branch)
   - Connects to the production server via SSH
   - Deploys the latest main branch image
   - Uses environment variables for flexibility
   - Runs container on port 3000

### Required Secrets

To use this CI/CD workflow, you need to set up the following GitHub secrets:

- `DOCKER_HUB_USERNAME`: The Docker Hub username
- `DOCKER_HUB_TOKEN`: A Docker Hub access token
- `SSH_HOST`: The IP address or hostname of your deployment VM
- `SSH_USERNAME`: The username for SSH access to the VM
- `SSH_PRIVATE_KEY`: The private SSH key for authentication

### Team Collaboration

This CI/CD setup supports collaborative development through:

1. **Branch-Based Workflow**
   - `main`: Production branch (deployed to production environment)
   - `development`: Staging branch (deployed to staging environment)
   - Feature branches: Create from development, merge via pull request

2. **Pull Request Workflow**
   - Create a feature branch from development
   - Make your changes and push
   - Create a pull request to development
   - CI will run tests and build Docker image
   - Review and approve
   - Merge to trigger deployment to staging

3. **Local Development with Docker**
   
   You can use the same Docker images locally:
   ```bash
   # Pull the latest development image
   docker pull [DOCKER_USERNAME]/frontend-coral:development
   
   # Run locally
   docker run -p 3000:3000 [DOCKER_USERNAME]/frontend-coral:development
   ```

4. **Manual Deployment**
   
   If needed, you can deploy manually using the script:
   ```bash
   # Deploy the latest main image
   ./scripts/deploy.sh --username [DOCKER_USERNAME] --tag main
   
   # Or deploy with custom settings
   ./scripts/deploy.sh --username [DOCKER_USERNAME] --tag development --port 3001 --container react-frontend-dev
   ```

### Best Practices

- Always create pull requests for changes
- Wait for CI checks to pass before merging
- Test on staging before promoting to production
- Use descriptive commit messages
