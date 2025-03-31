#!/bin/bash
# Deployment script for the frontend-coral application
# This script can be used to manually deploy the latest version of the application

# Exit on error
set -e

# Default configuration - can be overridden with environment variables
DOCKER_USERNAME=${DOCKER_USERNAME:-$(echo $DOCKER_HUB_USERNAME)}  # Will use GitHub secret in CI/CD
IMAGE_NAME=${IMAGE_NAME:-"frontend-coral"}
TAG=${TAG:-"main"}  # or "development" for staging
CONTAINER_NAME=${CONTAINER_NAME:-"react-frontend"}
PORT=${PORT:-3000}

# Display usage information if requested
if [ "$1" == "-h" ] || [ "$1" == "--help" ]; then
  echo "Usage: ./deploy.sh [options]"
  echo ""
  echo "Options:"
  echo "  -u, --username USERNAME    Docker Hub username (default: $DOCKER_USERNAME)"
  echo "  -i, --image IMAGE_NAME     Image name (default: $IMAGE_NAME)"
  echo "  -t, --tag TAG              Image tag (default: $TAG)"
  echo "  -c, --container NAME       Container name (default: $CONTAINER_NAME)"
  echo "  -p, --port PORT            Port to expose (default: $PORT)"
  echo "  -h, --help                 Show this help message"
  exit 0
fi

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -u|--username)
      DOCKER_USERNAME="$2"
      shift 2
      ;;
    -i|--image)
      IMAGE_NAME="$2"
      shift 2
      ;;
    -t|--tag)
      TAG="$2"
      shift 2
      ;;
    -c|--container)
      CONTAINER_NAME="$2"
      shift 2
      ;;
    -p|--port)
      PORT="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Ensure we have a Docker username
if [ -z "$DOCKER_USERNAME" ]; then
  echo "Error: Docker Hub username is required."
  echo "Please specify it with -u/--username or set the DOCKER_USERNAME environment variable."
  exit 1
fi

echo "Starting deployment of $DOCKER_USERNAME/$IMAGE_NAME:$TAG..."

# Pull the latest image
echo "Pulling the latest image from Docker Hub..."
docker pull $DOCKER_USERNAME/$IMAGE_NAME:$TAG

# Stop and remove the existing container if it exists
echo "Stopping and removing the existing container (if it exists)..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# Run the new container
echo "Starting the new container..."
docker run -d \
  --name $CONTAINER_NAME \
  -p $PORT:3000 \
  --restart unless-stopped \
  -e NODE_ENV=production \
  $DOCKER_USERNAME/$IMAGE_NAME:$TAG

# Verify the container is running
echo "Verifying the container is running..."
docker ps | grep $CONTAINER_NAME

# Clean up unused images
echo "Cleaning up unused images..."
docker image prune -af

echo "Deployment completed successfully!"
echo "The application is now running at http://localhost:$PORT" 