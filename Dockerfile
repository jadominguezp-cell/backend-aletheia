FROM node:20-alpine

# Install pnpm or stick to npm. 
# We'll use npm since package-lock.json is present.
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the NestJS application
RUN npm run build

# Expose port (must match PORT env)
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]
