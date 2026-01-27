# Use an official Node runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Accept build arguments
ARG REACT_APP_API_BASE_URL
ARG REACT_APP_WS_URL
ARG PUBLIC_URL

# Set as environment variables for build
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
ENV REACT_APP_WS_URL=$REACT_APP_WS_URL
ENV PUBLIC_URL=$PUBLIC_URL

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --silent --force --legacy-peer-deps
RUN npm install ajv ajv-keywords --force
RUN npm install -g react-scripts

# Copy the rest of the application
COPY . .

# Build app for production with env vars
RUN npm run build

# Make port 3000 available to the world outside this container
EXPOSE 3000

# Install serve to run the application
RUN npm install -g serve

RUN npx update-browserslist-db@latest

# Serve the production build
CMD ["serve", "-s", "build", "-l", "3000"]
