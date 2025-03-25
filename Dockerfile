# Use an official Node runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --silent --force --legacy-peer-deps
RUN npm install ajv ajv-keywords --force
RUN npm install -g react-scripts

# Copy the rest of the application
COPY . .

# Build app for production
RUN npm run build

# Make port 3000 available to the world outside this container
EXPOSE 3000

# Install serve to run the application
RUN npm install -g serve

# Define the command to run the app in detached mode
CMD ["serve", "-s", "build", "-l", "3000"]
