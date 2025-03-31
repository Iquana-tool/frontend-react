#!/bin/bash
# Script to help set up GitHub secrets using gh CLI
# Requirements: 
# - gh CLI installed (https://cli.github.com/)
# - Logged in to GitHub (run 'gh auth login')

# Exit on error
set -e

echo "Setup GitHub Secrets for CI/CD Pipeline"
echo "========================================"
echo ""
echo "This script will help you set up the required GitHub secrets for the CI/CD pipeline."
echo "You'll need to provide your Docker Hub credentials and SSH details."
echo ""

# Make sure gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed."
    echo "Please install it from https://cli.github.com/ and try again."
    exit 1
fi

# Check if logged in to GitHub
if ! gh auth status &> /dev/null; then
    echo "Error: Not logged in to GitHub."
    echo "Please run 'gh auth login' first and try again."
    exit 1
fi

# Get repository name
DEFAULT_REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")
if [ -z "$DEFAULT_REPO" ]; then
    echo "Enter your GitHub repository (format: username/repository):"
    read REPO
else
    echo "Enter your GitHub repository (format: username/repository) [$DEFAULT_REPO]:"
    read REPO_INPUT
    REPO=${REPO_INPUT:-$DEFAULT_REPO}
fi

echo ""
echo "1. Docker Hub Credentials"
echo "------------------------"
echo "Enter your Docker Hub username:"
read DOCKER_HUB_USERNAME

echo "Enter your Docker Hub access token (will not be displayed):"
read -s DOCKER_HUB_TOKEN
echo ""

echo ""
echo "2. SSH Deployment Details"
echo "------------------------"
echo "Enter your deployment server hostname or IP address:"
read SSH_HOST

echo "Enter your SSH username:"
read SSH_USERNAME

echo "Enter the path to your SSH private key file (~/.ssh/id_rsa):"
read -e -i "$HOME/.ssh/id_rsa" SSH_KEY_PATH

# Load the private key content
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo "Error: SSH key file not found at $SSH_KEY_PATH."
    exit 1
fi

SSH_PRIVATE_KEY=$(cat "$SSH_KEY_PATH")

echo ""
echo "Setting up secrets for repository: $REPO"
echo ""

# Set up the secrets
echo "Adding DOCKER_HUB_USERNAME..."
gh secret set DOCKER_HUB_USERNAME --body="$DOCKER_HUB_USERNAME" --repo="$REPO"

echo "Adding DOCKER_HUB_TOKEN..."
gh secret set DOCKER_HUB_TOKEN --body="$DOCKER_HUB_TOKEN" --repo="$REPO"

echo "Adding SSH_HOST..."
gh secret set SSH_HOST --body="$SSH_HOST" --repo="$REPO"

echo "Adding SSH_USERNAME..."
gh secret set SSH_USERNAME --body="$SSH_USERNAME" --repo="$REPO"

echo "Adding SSH_PRIVATE_KEY..."
gh secret set SSH_PRIVATE_KEY --body="$SSH_PRIVATE_KEY" --repo="$REPO"

echo ""
echo "Secrets set up successfully!"
echo ""
echo "You can now push to your repository to trigger the CI/CD pipeline." 