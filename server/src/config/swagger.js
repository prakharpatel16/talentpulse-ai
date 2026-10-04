const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'TalentPulse AI Recruitment & Talent Management Platform API',
    version: '1.0.0',
    description: 'Comprehensive, production-ready REST API for candidate and recruiter workflows, ATS pipeline, AI resume analysis, semantic job matching, automated mock interviews, and RAG assistant.'
  },
  servers: [
    {
      url: '/api',
      description: 'Primary API server'
    }
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'access_token'
      },
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  paths: {
    '/health': {
      get: {
        summary: 'Check API service health',
        responses: {
          200: { description: 'API operational' }
        }
      }
    },
    '/auth/register': {
      post: {
        summary: 'Register a new candidate or recruiter',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                  password: { type: 'string' },
                  role: { type: 'string', enum: ['candidate', 'recruiter'] }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Account created' } }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Log in and receive HTTP-only authentication cookie',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Login successful' } }
      }
    },
    '/auth/me': {
      get: {
        summary: 'Get current authenticated user info',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { 200: { description: 'User profile retrieved' } }
      }
    },
    '/jobs': {
      get: {
        summary: 'Search and filter active job requisitions',
        responses: { 200: { description: 'List of jobs' } }
      },
      post: {
        summary: 'Create a new job posting (Recruiter only)',
        security: [{ cookieAuth: [] }],
        responses: { 201: { description: 'Job created' } }
      }
    },
    '/applications': {
      get: {
        summary: 'Get recruiter candidate applications and ATS stages',
        security: [{ cookieAuth: [] }],
        responses: { 200: { description: 'Applications list' } }
      },
      post: {
        summary: 'Submit application for a job (Candidate only)',
        security: [{ cookieAuth: [] }],
        responses: {
          201: { description: 'Application submitted' },
          409: { description: 'Selected resume has not finished text extraction' }
        }
      }
    },
    '/resumes': {
      post: {
        summary: 'Upload a resume and queue background processing',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: {
          201: { description: 'Resume stored and queued; response includes resume ID, job ID, and processing status' },
          503: { description: 'Resume stored but the background queue is unavailable' }
        }
      }
    },
    '/ai/resume-analysis/{resumeId}': {
      post: {
        summary: 'Queue AI analysis for a resume',
        description: 'Returns the processing job ID and current status. Poll the GET endpoint for the saved result and MongoDB processing status.',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: {
          202: { description: 'Resume analysis queued' },
          403: { description: 'Not authorized to process this resume' },
          404: { description: 'Resume not found' },
          503: { description: 'Background queue unavailable' }
        }
      },
      get: {
        summary: 'Get AI analysis results and resume processing status',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: {
          200: { description: 'Saved analysis (if complete) and processing status' },
          403: { description: 'Not authorized to view this resume' },
          404: { description: 'Resume not found' }
        }
      }
    },
    '/interviews': {
      post: {
        summary: 'Create an AI technical assessment interview',
        security: [{ cookieAuth: [] }],
        responses: { 201: { description: 'Interview created' } }
      }
    },
    '/rag/query': {
      post: {
        summary: 'Query recruitment intelligence assistant with cited sources',
        security: [{ cookieAuth: [] }],
        responses: { 200: { description: 'RAG synthesized answer with sources' } }
      }
    }
  }
};

module.exports = {
  swaggerUi,
  swaggerDocument
};
