# 🔍 HireLens Enterprise

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=FFD62B)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-398200?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Qdrant](https://img.shields.io/badge/Qdrant_Vector_DB-FF4F5A?style=for-the-badge&logo=qdrant&logoColor=white)](https://qdrant.tech/)
[![Ollama](https://img.shields.io/badge/Ollama_Embedding-000000?style=for-the-badge&logo=ollama&logoColor=white)](https://ollama.com/)

An **Evidence-Based Enterprise Recruitment Intelligence Suite** designed for high-stakes hiring. Featuring semantic resume indexing over Qdrant Cloud, local Ollama-powered embeddings, interactive proctoring flags, and secure Google OAuth2 SSO.

---

## 🏗️ System Architecture & Stack

### Frontend (`/src`)
*   **Vite + React** with fully typed component pipelines.
*   **Tailwind CSS v4** styling following a custom professional design system.
*   **SSO Integration**: Direct authorization token capture from backend redirects.

### Backend (`/backend`)
*   **Express REST APIs** with rate limiting, helmet security, and CORS mappings.
*   **Prisma 7 ORM** connecting to local PostgreSQL.
*   **Qdrant Cloud SDK**: Semantic vector storage with deterministic CUID-to-UUID point hashing.
*   **Ollama (all-minilm)**: High-performance local text embeddings generator.
*   **KafkaJS**: Automated resume indexing consumer hook.

---

## 🚀 Getting Started

### 1. Requirements
*   **Node.js** v20+ / NPM
*   **PostgreSQL** (Docker container on port 5432)
*   **Ollama** (`ollama serve` running with the `all-minilm` model)
*   **Qdrant Cloud** URL & API key credentials

---

### 2. Backend Configuration & Setup

1.  Navigate into the `backend` folder:
    ```bash
    cd backend
    ```

2.  Copy `.env.example` (or edit/create `.env`):
    ```env
    PORT=4000
    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hirelens?schema=public"
    JWT_SECRET="your-jwt-secret-key"
    JWT_REFRESH_SECRET="your-jwt-refresh-secret-key"
    UPSTASH_REDIS_REST_URL="https://your-redis-instance.upstash.io"
    UPSTASH_REDIS_REST_TOKEN="your-upstash-token"
    QDRANT_URL="https://your-qdrant-cluster.qdrant.io"
    QDRANT_API_KEY="your-qdrant-api-key"
    OLLAMA_URL="http://localhost:11434"
    GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
    GOOGLE_CLIENT_SECRET="your-google-client-secret"
    GOOGLE_REDIRECT_URI="http://localhost:4000/api/v1/auth/google/callback"
    ```

3.  Install dependencies:
    ```bash
    npm install
    ```

4.  Generate Prisma Client:
    ```bash
    npx prisma generate
    ```

5.  Run Backend Integration Tests to verify everything:
    ```bash
    # Test Ollama + Qdrant Cloud + Prisma Search
    npx tsx src/scripts/test-semantic-search.ts

    # Test Google OAuth2 URL & Mock Callback
    npx tsx src/scripts/test-google-oauth.ts
    ```

6.  Start the development backend server:
    ```bash
    npm run dev
    ```

---

### 3. Frontend Configuration & Setup

1.  From the root workspace directory, install dependencies:
    ```bash
    npm install
    ```

2.  Start the frontend web application:
    ```bash
    npm run dev
    ```

3.  Open the web browser to **`http://localhost:5173`**.

---

## 🛠️ Key Operations & Features

### 👤 Google SSO Login
Click the **Sign In with SSO** button on the login screen. It redirects to the Google Consent Screen using `/api/v1/auth/google/url`. Upon approval, Google redirects back to the backend, which exchanges the authorization code, upserts the user database record, and redirects back to the frontend with access tokens. The frontend automatically parses the parameters and signs you in.

### 🔍 AI Semantic Query
Type natural language queries (e.g., *"Senior Frontend Engineer with Tailwind CSS experience"*) into the search bar. The frontend debounces the query and calls `/api/v1/search?query=...`, returning matching profiles mapped from vector proximity scores in Qdrant. If the backend is offline, the client falls back to local regex filtering of initial mock data.
