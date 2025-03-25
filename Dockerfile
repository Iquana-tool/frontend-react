# Use an official Node runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --silent --force --legacy-peer-deps
RUN npm install ajv ajv-keywords --force

# Copy the rest of the application
COPY . .

# Make port 3000 available to the world outside this container
EXPOSE 3000

# Define the command to run the app
CMD ["npm", "start"]
