<div align="center">
  <h1>
    <a href="https://talentpulse-chi.vercel.app/">
      <img src="assets/talentpulse-wordmark.svg" alt="TalentPulse" width="560" />
    </a>
  </h1>
  <p><strong>AI-powered recruitment and talent management</strong></p>
  <p>One workspace for job discovery, resume insights, applications, interviews, and recruiter workflows.</p>
  <p>
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
    <img src="https://img.shields.io/badge/Node.js-Express-339933?logo=nodedotjs&logoColor=white" alt="Node.js and Express" />
    <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white" alt="MongoDB and Mongoose" />
    <img src="https://img.shields.io/badge/AI-Gemini%20%7C%20RAG-4285F4?logo=googlegemini&logoColor=white" alt="Gemini and RAG" />
  </p>
  <p>
    <a href="https://talentpulse-chi.vercel.app/"><strong>Live Demo</strong></a> ·
    <a href="https://github.com/prakharpatel16/talentpulse-ai">GitHub repository</a> ·
    <a href="https://www.linkedin.com/in/prakharpatel674/">LinkedIn</a> ·
    <a href="mailto:patelprakhar674@gmail.com">Email</a>
  </p>
</div>

> **Human-centered AI:** TalentPulse provides structured suggestions for people to review. It does not make hiring decisions.

## Contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [Architecture](#architecture)
- [Resume processing](#resume-processing)
- [Recruiter AI assistant (RAG)](#recruiter-ai-assistant-rag)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [API overview](#api-overview)
- [Deployment](#deployment)
- [Current limitations](#current-limitations)
- [Project structure](#project-structure)
- [Contact](#contact)
- [License](#license)

## Features

### Candidate workspace

- Register as a candidate and manage a profile.
- Browse, search, and filter published jobs.
- Upload PDF or DOCX resumes up to 10 MB and view asynchronous processing status.
- Review structured resume feedback when AI analysis is available.
- Apply to jobs with a selected resume and track application progress.
- Complete assigned text-based interview assessments.
- View notifications and manage account settings.

### Recruiter workspace

- Manage company information and job requisitions.
- Publish, edit, close, and delete jobs.
- Review applicants and move them through the ATS pipeline: Applied, Under Review, Shortlisted, Interview, Selected, or Rejected.
- View dashboard metrics and hiring analytics.
- Inspect job matches and compare applicants.
- Create interview assessments, review evaluations, and add notes.
- Ask questions about recruiter-owned jobs and applicants in the recruitment assistant.
- View notifications and manage account settings.

## Technology stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, React Router 7, Vite 6, Recharts, Lucide React, custom CSS |
| Backend | Node.js, Express 4, Mongoose 8, REST API |
| Database | MongoDB |
| Cache and queue | Redis client, BullMQ |
| Background processing | Separate Node.js resume worker |
| Realtime | Socket.IO with Redis Pub/Sub for worker notifications |
| AI | Google Gemini API (optional) |
| Retrieval-augmented generation (RAG) | Recruiter-scoped MongoDB documents, deterministic pseudo-embeddings, cosine-similarity retrieval, and optional Gemini answer generation |
| Resume parsing | pdf-parse for PDF and Mammoth for DOCX |
| Validation and security | Zod, bcryptjs, JWT, cookie-parser, Helmet, CORS |
| API documentation | Swagger UI |
| Testing | Node.js test runner and Supertest |

## Architecture

~~~mermaid
flowchart LR
    User[Candidate or recruiter]
    UI[React + Vite SPA]
    API[Express API + Socket.IO]
    DB[(MongoDB<br/>source of truth)]
    Redis[(Redis<br/>cache, queue, Pub/Sub)]
    Queue[BullMQ<br/>resume-processing]
    Worker[Resume worker]
    Disk[(Shared upload directory)]
    Gemini[Gemini API<br/>optional]

    User <-->|HTTPS| UI
    UI <-->|REST with cookies| API
    API <--> DB
    API <--> Redis
    API -->|resume and candidate IDs| Queue
    Queue --> Worker
    Worker <--> DB
    API --> Disk
    Worker --> Disk
    API -. AI requests .-> Gemini
    Worker -. AI requests .-> Gemini
    Worker -->|notification event| Redis
    Redis -->|Pub/Sub| API
    API -->|Socket.IO notification| User
~~~

- **MongoDB** stores accounts, companies, jobs, applications, resumes, analyses, interviews, documents, assistant threads, and notifications.
- **Redis** stores recruiter dashboard cache entries, BullMQ queue state, and worker-to-API notification events. MongoDB remains the source of truth.
- **Resume analysis** is the only current BullMQ background job. Job matching and RAG queries run synchronously in the API.
- Resume jobs contain identifiers only; the worker reads the uploaded file from **UPLOAD_DIR**.

## Resume processing

1. The API saves an uploaded PDF or DOCX file and creates a MongoDB resume record.
2. The API enqueues **{ resumeId, candidateId }** in **resume-processing**.
3. The worker extracts text, creates a structured profile and pseudo-embedding, and optionally calls Gemini.
4. The worker saves the analysis and RAG document in MongoDB, updates resume status, and persists a notification.
5. The frontend polls status and displays the result.

Jobs retry three times with exponential backoff. If Redis is unavailable, enqueue requests return an error instead of claiming the resume is processing.

## Recruiter AI assistant (RAG)

The recruiter assistant uses retrieval-augmented generation to answer questions using recruitment data the current recruiter is allowed to access.

1. The API checks the recruiter’s jobs and applicants, then loads up to 50 eligible documents from MongoDB.
2. It creates a deterministic pseudo-embedding for the question and scores documents with cosine similarity.
3. It sends up to four of the most relevant documents, along with the question and optional job context, to Gemini.
4. The response includes source snippets. The question, answer, and sources are saved in the recruiter’s MongoDB conversation thread.

Threads can be revisited from the assistant page. Gemini is optional; without a Gemini key, the service uses its fallback response. This is an in-app retrieval pipeline rather than a vector database: embeddings are deterministic pseudo-embeddings, retrieval is synchronous, and there is no Atlas Vector Search integration.

## Quick start

### Requirements

- Node.js and npm
- MongoDB
- Redis

The API has a development-only embedded MongoDB fallback, but the separate worker cannot share that embedded database. For resume processing, point both processes at the same MongoDB URI. Redis is required for the queue.

### Install and configure

From the project root:

~~~bash
npm install --prefix server
npm install --prefix client
cp server/.env.example server/.env
cp client/.env.example client/.env
~~~

Update **server/.env** with your local MongoDB and Redis URLs. The defaults are **mongodb://localhost:27017/talentpulse** and **redis://localhost:6379**.

### Start the app

Run each command in a separate terminal:

~~~bash
# API
npm run dev --prefix server

# Resume worker
npm run worker --prefix server

# Frontend
npm run dev --prefix client
~~~

Open **http://localhost:5173**. The API runs at **http://localhost:5000** and Swagger UI is at **http://localhost:5000/api/docs**.

### Development demo accounts

When the API starts in development against an empty database, it seeds demo data:

| Role | Email | Password |
|---|---|---|
| Recruiter | **recruiter@talentpulse.com** | **TalentPulse2025!** |
| Candidate | **sarah.jenkins@example.com** | **TalentPulse2025!** |

These credentials are for local development only. Production does not seed demo accounts.

## Environment variables

### Server

| Variable | Required | Description |
|---|---|---|
| PORT | Host-provided in deployment | API port; defaults to **5000** locally |
| NODE_ENV | Production | Set to **production** when deployed |
| CLIENT_URL | Production | Exact frontend origin; comma-separated for multiple allowed origins |
| MONGODB_URI | Production | MongoDB connection URI |
| REDIS_URL | Production | Redis-compatible connection URI: **redis://** or **rediss://** |
| JWT_SECRET | Production | Random signing secret, at least 32 characters |
| COOKIE_SECRET | Production | Separate random signing secret, at least 32 characters |
| UPLOAD_DIR | Optional | Upload directory; defaults to **server/uploads** |
| GEMINI_API_KEY | Optional | Enables Gemini-powered features |

Generate distinct secrets with Node.js:

~~~bash
node -p "require('crypto').randomBytes(48).toString('hex')"
~~~

Run it twice and keep both values private. Never commit **.env** files or expose secrets in frontend variables.

### Client

| Variable | Purpose |
|---|---|
| VITE_API_URL | API base URL; use **/api** locally and the full deployed API URL in production |
| VITE_DEV_API_TARGET | Vite development proxy target; defaults to **http://localhost:5000** |

## API overview

All API routes are under **/api**.

| Prefix | Main endpoints |
|---|---|
| /auth | Register, login, logout, current user, profile, password |
| /companies | Recruiter company profile |
| /jobs | Job search/details and recruiter job management |
| /applications | Apply, list applications, update ATS status |
| /resumes | Upload, list, download, delete, set primary |
| /ai | Enqueue resume analysis and retrieve status/results |
| /matching | Resume-to-job match, job matches, candidate comparison |
| /interviews | Create, answer, evaluate, report, and add notes |
| /dashboard | Recruiter overview and analytics |
| /rag | Assistant queries and conversation threads |
| /notifications | List and mark notifications read |

Open the interactive [Swagger API docs](http://localhost:5000/api/docs) while the API is running locally. The architecture and route overview are documented in this README.

## Tests and production build

~~~bash
npm test --prefix server
npm run build --prefix client
~~~

## Deployment

The repository includes a starter deployment layout:

- **Vercel:** deploy the **client/** directory as a Vite site. Build with **npm run build**, publish **dist**, and set **VITE_API_URL** to **https://<api-domain>/api**.
- **Render:** deploy the **server/** directory as a Web Service. Use **npm ci** as the build command and **npm run start:all** as the start command. Set the health check to **/api/health**.
- **MongoDB Atlas:** set **MONGODB_URI**.
- **Render Key Value or compatible Redis:** set **REDIS_URL** and select **noeviction** for BullMQ queue storage.

The current upload implementation uses local disk. For a small demo deployment, run the API and worker together in one Render service, attach a persistent disk mounted at **/var/data**, and set **UPLOAD_DIR=/var/data/uploads**. This requires a paid Render service; its disk is limited to that service and one instance. See [Render disk limits](https://render.com/docs/disks) and [Render Key Value queue guidance](https://render.com/docs/key-value).

Set **CLIENT_URL** to the exact frontend origin. For production authentication, custom sibling domains such as **app.example.com** and **api.example.com** are recommended because the app uses credentialed cookies. The worker and API must share **MONGODB_URI**, **REDIS_URL**, and the upload directory.

Before scaling the API and worker separately or running multiple API instances, migrate uploads to shared object storage. Cloudinary variables exist in the environment example, but Cloudinary integration is not implemented.

## Current limitations

- Resume text extraction supports PDF and DOCX; OCR for scanned resumes is not implemented.
- Embeddings are deterministic pseudo-embeddings, not a production embedding model. There is no vector database or Atlas Vector Search.
- The RAG assistant uses an in-app cosine similarity search and runs synchronously.
- Job matching runs synchronously; only resume processing uses BullMQ.
- Interviews are text-based; no video meeting provider is integrated.
- Gemini is optional. Without a key, AI analysis may be unavailable or use a human-review fallback.
- The rate limiter stores counters in API-process memory and is not distributed across multiple instances.
- The company logo route currently uses the PDF/DOCX upload filter, so image-logo uploads need a dedicated upload configuration.

## Project structure

The repository is a two-part application: a Vite-powered React client and a Node.js/Express server. The resume worker runs as a separate server process.

~~~text
TalentPulse/
├── client/
│   ├── src/
│   │   ├── components/       Shared application shell
│   │   ├── lib/              API client and authentication context
│   │   ├── pages/            Candidate and recruiter screens
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── src/
│   │   ├── config/           MongoDB, Redis, environment, Swagger
│   │   ├── controllers/      REST request handlers
│   │   ├── middleware/       Authentication, validation, security
│   │   ├── models/           Mongoose schemas
│   │   ├── queues/           BullMQ queue and Redis client
│   │   ├── routes/           REST API route definitions
│   │   ├── services/         AI, RAG, parsing, cache, notifications
│   │   ├── utils/            Shared helpers and demo data
│   │   ├── validators/       Request schemas
│   │   ├── workers/          Resume-processing worker logic
│   │   ├── app.js
│   │   ├── server.js         API and Socket.IO entry point
│   │   ├── start-all.js      API/worker process supervisor
│   │   └── worker.js         Worker entry point
│   ├── tests/                Backend tests
│   ├── .env.example
│   └── package.json
├── .gitignore
└── README.md
~~~

## Contact

**Prakhar Patel**

- LinkedIn: [linkedin.com/in/prakharpatel674](https://www.linkedin.com/in/prakharpatel674/)
- Email: [patelprakhar674@gmail.com](mailto:patelprakhar674@gmail.com)

## License

This project is licensed under the [MIT License](LICENSE).
