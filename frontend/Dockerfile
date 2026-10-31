FROM node:20-alpine

WORKDIR /app

# Install dependencies with frozen lockfile
COPY package*.json ./
RUN npm ci

# Copy application source
COPY . .

EXPOSE 5173

ENV VITE_API_BASE_URL=http://localhost:8000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
