const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
const Job = require('../models/Job');
const Resume = require('../models/Resume');
const Application = require('../models/Application');
const Interview = require('../models/Interview');
const AIAnalysis = require('../models/AIAnalysis');
const Document = require('../models/Document');
const Notification = require('../models/Notification');
const Thread = require('../models/Thread');
const logger = require('./logger');
const { generatePseudoEmbedding } = require('../services/embedding.service');

const seedData = async () => {
  try {
    const existingRecruiter = await User.findOne({ email: 'recruiter@talentpulse.com' });
    if (existingRecruiter) {
      logger.info('Database already contains seed data. Skipping seed.');
      return;
    }

    logger.info('Seeding database with TalentPulse demo records...');

    const salt = await bcrypt.genSalt(10);
    const defaultPassword = await bcrypt.hash('TalentPulse2025!', salt);

    // 1. Create Recruiter: Eleanor Vance
    const recruiter = await User.create({
      name: 'Eleanor Vance',
      email: 'recruiter@talentpulse.com',
      passwordHash: defaultPassword,
      role: 'recruiter',
      phone: '+1 (415) 890-4321',
      location: 'San Francisco, CA',
      title: 'Talent Director',
      profileImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
      profile: {
        bio: 'Leading talent acquisition and engineering hiring velocity at LinearScale AI.'
      }
    });

    // 2. Create Company: LinearScale AI
    const company = await Company.create({
      name: 'LinearScale AI',
      description: 'Building next-generation generative AI infrastructure and developer velocity tools.',
      logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
      website: 'https://linearscale.ai',
      location: 'San Francisco, CA',
      industry: 'Artificial Intelligence & SaaS',
      companySize: '150-500 employees',
      recruiterId: recruiter._id
    });

    // 3. Create Candidates
    const candidate1 = await User.create({
      name: 'Sarah Jenkins',
      email: 'sarah.jenkins@example.com',
      passwordHash: defaultPassword,
      role: 'candidate',
      phone: '+1 (555) 234-5678',
      location: 'San Francisco, CA',
      title: 'Senior Full-Stack Engineer',
      profileImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
      profile: {
        bio: 'Accomplished Senior Full-Stack Engineer with 7+ years of experience specializing in high-throughput React/Node.js web architectures, distributed systems, and design system infrastructures.',
        skills: ['React', 'Node.js', 'TypeScript', 'JavaScript', 'Next.js', 'Express', 'MongoDB', 'Redis', 'Tailwind CSS', 'Docker', 'REST APIs', 'System Design'],
        education: [{
          institution: 'University of California, Berkeley',
          degree: 'B.S. in Computer Science',
          field: 'Software Engineering',
          startYear: 2014,
          endYear: 2018
        }],
        experience: [{
          company: 'Linear Labs',
          position: 'Senior Software Engineer',
          startDate: '2021',
          endDate: 'Present',
          description: 'Architected distributed web application pipelines reducing p99 latency by 34%.'
        }],
        projects: [{
          name: 'TalentPulse Platform',
          description: 'AI-assisted recruitment ATS platform with real-time candidate scoring.',
          technologies: ['React', 'Node.js', 'MongoDB', 'Redis'],
          url: 'https://github.com/talentpulse'
        }]
      }
    });

    const candidate2 = await User.create({
      name: 'Marcus Vance',
      email: 'marcus.vance@example.com',
      passwordHash: defaultPassword,
      role: 'candidate',
      phone: '+1 (555) 987-6543',
      location: 'New York, NY',
      title: 'Staff Distributed Systems Engineer',
      profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      profile: {
        bio: 'Staff Backend & Distributed Systems Engineer specialized in high-concurrency microservices, Kafka pipelines, and database tuning.',
        skills: ['Node.js', 'Go', 'Distributed Systems', 'Kafka', 'Redis', 'PostgreSQL', 'Docker', 'Kubernetes', 'MongoDB', 'React']
      }
    });

    const candidate3 = await User.create({
      name: 'Elena Rostova',
      email: 'elena.rostova@example.com',
      passwordHash: defaultPassword,
      role: 'candidate',
      phone: '+1 (555) 456-7890',
      location: 'Seattle, WA',
      title: 'Lead Product Designer & Design Architect',
      profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      profile: {
        bio: 'Principal UI/UX Architect crafting enterprise design systems with Figma, React tokens, and high-density accessibility standards.',
        skills: ['Design Systems', 'Figma', 'React', 'Tailwind CSS', 'UI/UX', 'Accessibility (WCAG AA)', 'Prototyping']
      }
    });

    // 4. Create Requisitions (Jobs)
    const job1 = await Job.create({
      companyId: company._id,
      recruiterId: recruiter._id,
      requisitionCode: 'REQ-1042',
      title: 'Senior Full-Stack Engineer (MERN / Platform)',
      department: 'Engineering & Platform',
      description: 'We are seeking a senior full-stack engineer to build scalable web applications, real-time collaboration workflows, and AI talent intelligence systems.',
      responsibilities: [
        'Design and implement scalable RESTful APIs with Node.js, Express, and MongoDB.',
        'Develop responsive, high-performance UI components in React with Tailwind CSS.',
        'Integrate Redis caching and background worker queues for asynchronous operations.',
        'Collaborate with AI researchers to deploy Gemini-powered evaluation workflows.'
      ],
      requiredSkills: ['React', 'Node.js', 'MongoDB', 'Express', 'TypeScript', 'REST APIs'],
      preferredSkills: ['Redis', 'Docker', 'LangChain.js', 'Socket.IO'],
      experience: { min: 4, max: 8 },
      location: 'San Francisco, CA (Hybrid / Remote)',
      employmentType: 'full-time',
      salaryRange: { min: 160000, max: 210000, currency: 'USD' },
      status: 'published',
      embedding: generatePseudoEmbedding('Senior Full-Stack Engineer MERN React Node.js MongoDB Express TypeScript Redis')
    });

    const job2 = await Job.create({
      companyId: company._id,
      recruiterId: recruiter._id,
      requisitionCode: 'REQ-1043',
      title: 'Staff Frontend Architect (Core Design System)',
      department: 'Product & Design',
      description: 'Lead frontend design systems, state architecture, and micro-frontend integrations across our enterprise dashboard suite.',
      responsibilities: [
        'Architect reusable component design systems with WCAG AA accessibility compliance.',
        'Establish frontend performance budgets and runtime optimizations in React 18.',
        'Partner with Product and Brand teams to maintain clean visual rhythm and design tokens.'
      ],
      requiredSkills: ['React', 'TypeScript', 'Tailwind CSS', 'Design Systems', 'Architecture'],
      preferredSkills: ['Next.js', 'Storybook', 'Figma API'],
      experience: { min: 6, max: 10 },
      location: 'Remote',
      employmentType: 'full-time',
      salaryRange: { min: 180000, max: 235000, currency: 'USD' },
      status: 'published',
      embedding: generatePseudoEmbedding('Staff Frontend Architect Design Systems React TypeScript Tailwind CSS Accessibility')
    });

    const job3 = await Job.create({
      companyId: company._id,
      recruiterId: recruiter._id,
      requisitionCode: 'REQ-1044',
      title: 'Engineering Manager (Talent AI Infrastructure)',
      department: 'Engineering Leadership',
      description: 'Lead an agile squad of 8 senior full-stack engineers and ML practitioners building AI-assisted talent workflows.',
      responsibilities: [
        'Mentor and scale a high-velocity product engineering team.',
        'Deliver quarterly platform OKRs and maintain technical excellence.'
      ],
      requiredSkills: ['Engineering Management', 'System Design', 'Agile', 'Node.js', 'React'],
      preferredSkills: ['RAG Architectures', 'LLM Evaluations'],
      experience: { min: 7, max: 12 },
      location: 'San Francisco, CA',
      employmentType: 'full-time',
      salaryRange: { min: 210000, max: 270000, currency: 'USD' },
      status: 'published',
      embedding: generatePseudoEmbedding('Engineering Manager Talent AI Leadership Agile System Design')
    });

    const job4 = await Job.create({
      companyId: company._id,
      recruiterId: recruiter._id,
      requisitionCode: 'REQ-1045',
      title: 'Principal Distributed Systems Engineer',
      department: 'Infrastructure Core',
      description: 'Design multi-region data replication, low-latency search caches, and message queuing foundations.',
      responsibilities: [
        'Architect high-throughput vector search indexes and distributed message brokers.'
      ],
      requiredSkills: ['Distributed Systems', 'Go', 'Node.js', 'Kafka', 'Redis', 'Database Tuning'],
      preferredSkills: ['MongoDB Atlas Vector Search', 'Kubernetes'],
      experience: { min: 8, max: 15 },
      location: 'Remote',
      employmentType: 'full-time',
      salaryRange: { min: 220000, max: 290000, currency: 'USD' },
      status: 'published',
      embedding: generatePseudoEmbedding('Principal Distributed Systems Engineer Go Node.js Kafka Redis Vector Search')
    });

    // 5. Create Resumes
    const sarahResumeText = `SARAH JENKINS\nSenior Full-Stack Engineer\nEmail: sarah.jenkins@example.com | Phone: +1 (555) 234-5678 | San Francisco, CA\n\n` +
      `EXECUTIVE SUMMARY:\nAccomplished Senior Full-Stack Engineer with 7+ years of experience specializing in high-throughput React/Node.js web architectures, distributed systems, and design system infrastructures. Demonstrates clear business impact with quantifiable outcomes across enterprise SaaS platforms.\n\n` +
      `TECHNICAL COMPETENCIES:\nFrontend: React 18, Next.js, Redux Toolkit, Tailwind CSS, TypeScript, Webpack, Vite.\nBackend: Node.js, Express.js, REST APIs, GraphQL, Microservices.\nDatabases & Caching: MongoDB, Mongoose, Redis, PostgreSQL.\nDevOps & Testing: Docker, CI/CD GitHub Actions, Jest, Vitest, Supertest, Cypress.\n\n` +
      `PROFESSIONAL EXPERIENCE:\nSenior Full-Stack Engineer — HighScale Tech (2021 – Present)\n- Engineered multi-tenant recruiter workflow used by 12,000+ daily active hiring managers.\n- Reduced dashboard initial page load from 2.4s to 420ms through code-splitting and Redis caching.\n- Maintained 92% automated test coverage across 45 backend endpoints.\n\n` +
      `Full-Stack Software Engineer — CloudVelocity Inc (2018 – 2021)\n- Developed Node.js REST API services processing 15M daily requests.\n- Built real-time applicant status pipeline utilizing WebSockets and MongoDB aggregation.\n\n` +
      `EDUCATION:\nBachelor of Science in Computer Science, UC Berkeley, 2018 (Magna Cum Laude).`;

    const resume1 = await Resume.create({
      candidateId: candidate1._id,
      fileUrl: '/uploads/Sarah_Jenkins_Senior_FullStack_2024.pdf',
      fileName: 'Sarah_Jenkins_Senior_FullStack_2024.pdf',
      fileType: 'application/pdf',
      fileSize: 482000,
      isPrimary: true,
      processingStatus: 'completed',
      parsedText: sarahResumeText,
      structuredData: {
        name: 'Sarah Jenkins',
        email: 'sarah.jenkins@example.com',
        phone: '+1 (555) 234-5678',
        location: 'San Francisco, CA',
        summary: 'Accomplished Senior Full-Stack Engineer with 7+ years specializing in React and Node.js architectures.',
        skills: ['React', 'Node.js', 'Express', 'MongoDB', 'JavaScript', 'TypeScript', 'Tailwind CSS', 'Redis', 'Docker'],
        experience: [
          { company: 'HighScale Tech', position: 'Senior Full-Stack Engineer', duration: '2021 - Present' },
          { company: 'CloudVelocity Inc', position: 'Full-Stack Software Engineer', duration: '2018 - 2021' }
        ],
        education: [{ institution: 'UC Berkeley', degree: 'B.S. Computer Science', year: '2018' }]
      },
      embedding: generatePseudoEmbedding(sarahResumeText)
    });

    // 6. Create AI Analysis for Sarah's Resume
    await AIAnalysis.create({
      resumeId: resume1._id,
      candidateId: candidate1._id,
      summary: 'Accomplished Senior Full-Stack Engineer with 7+ years of experience specializing in high-throughput React/Node.js web architectures, distributed systems, and design system infrastructures. Demonstrates clear business impact with quantifiable outcomes across enterprise SaaS platforms.',
      benchmarkScore: 92,
      yearsOfExperience: 7.5,
      domain: 'Enterprise SaaS & Web Platforms',
      strengths: [
        'End-to-end full stack architecture with production-proven React and Node.js mastery',
        'Strong optimization track record (reduced latency by 34% and bundle sizes by 40%)',
        'Hands-on experience with modern testing suites (Jest, Supertest, Vitest)'
      ],
      weakAreas: [
        'Limited direct production exposure to Kafka distributed event streaming',
        'Kubernetes container orchestration not explicitly detailed in recent roles'
      ],
      suggestions: [
        'Add architectural case studies detailing distributed failover and consensus mechanics',
        'Quantify security audits (SOC-2, GDPR) implemented during enterprise SaaS deployments'
      ],
      skills: {
        technical: ['React', 'Node.js', 'Express', 'MongoDB', 'TypeScript', 'JavaScript', 'Tailwind CSS', 'REST APIs'],
        tools: ['Git', 'Docker', 'Redis', 'Jest', 'Vite', 'Postman', 'GitHub Actions'],
        soft: ['Technical Leadership', 'Cross-functional Collaboration', 'Mentorship', 'Design System Architecture']
      },
      missingInformation: ['Open-source GitHub contribution stats', 'AWS Solutions Architect certification']
    });

    // 7. Create Applications
    // App 1: Sarah Jenkins -> REQ-1042 (Status: interview)
    const app1 = await Application.create({
      candidateId: candidate1._id,
      jobId: job1._id,
      resumeId: resume1._id,
      coverLetter: 'I am excited to bring my 7+ years of production MERN experience and distributed web architecture expertise to LinearScale AI.',
      status: 'interview',
      matchPercentage: 94,
      matchData: {
        matchingSkills: ['React', 'Node.js', 'MongoDB', 'Express', 'TypeScript', 'REST APIs'],
        missingSkills: ['Docker'],
        relevantExperience: [
          'Engineered multi-tenant recruiter workflow used by 12,000+ daily active users',
          'Architected distributed caching and background BullMQ workflows'
        ],
        relevantProjects: ['TalentPulse ATS Platform', 'Enterprise Cloud Portal'],
        explanation: 'Candidate has 94% alignment with the Senior Full-Stack Engineer role, exhibiting mastery in all primary requirements.'
      },
      appliedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    });

    // App 2: Marcus Vance -> REQ-1042 (Status: shortlisted)
    await Application.create({
      candidateId: candidate2._id,
      jobId: job1._id,
      resumeId: resume1._id,
      coverLetter: 'Interested in applying my distributed systems experience to scalable recruiter intelligence platforms.',
      status: 'shortlisted',
      matchPercentage: 88,
      matchData: {
        matchingSkills: ['Node.js', 'MongoDB', 'TypeScript', 'REST APIs'],
        missingSkills: ['React'],
        relevantExperience: ['Built distributed backend systems processing millions of concurrent events'],
        relevantProjects: ['High-throughput message pipeline'],
        explanation: 'Strong backend systems candidate with deep architectural competencies.'
      },
      appliedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    });

    // App 3: Elena Rostova -> REQ-1043 (Status: selected)
    await Application.create({
      candidateId: candidate3._id,
      jobId: job2._id,
      resumeId: resume1._id,
      coverLetter: 'Passionate about crafting institutional design systems with enterprise clarity and precision.',
      status: 'selected',
      matchPercentage: 96,
      matchData: {
        matchingSkills: ['Design Systems', 'React', 'Tailwind CSS', 'TypeScript', 'Architecture'],
        missingSkills: [],
        relevantExperience: ['Led global design system adopted across 8 enterprise products'],
        relevantProjects: ['Design token engine'],
        explanation: 'Top-tier design systems architect with exceptional craft and engineering execution.'
      },
      appliedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    });

    // 8. Create Interview for Sarah Jenkins
    const interview1 = await Interview.create({
      jobId: job1._id,
      candidateId: candidate1._id,
      recruiterId: recruiter._id,
      experienceLevel: 'senior',
      requiredSkills: ['React', 'Node.js', 'MongoDB', 'State Architecture'],
      interviewType: 'technical',
      numberOfQuestions: 5,
      questions: [
        {
          id: 'Q1',
          question: 'How would you architect client-side state synchronization in React 18 for a WebSocket stream delivering 10,000 updates/sec without UI frame drops?',
          answer: 'I would decouple the WebSocket ingestion stream from React rendering loop by buffering inbound mutations in an off-thread Web Worker or in-memory ring buffer. In the React layer, I leverage React 18 startTransition and useDeferredValue to prioritize immediate user interactions over high-frequency background telemetries. Furthermore, I implement RAF-synchronized batching to ensure UI updates are scheduled strictly once per 16ms animation frame.',
          evaluation: {
            relevance: 5,
            technicalUnderstanding: 5,
            completeness: 5,
            clarity: 5,
            feedback: 'Exceptional response. Demonstrates production mastery of React 18 concurrent features and browser rendering pipeline constraints.'
          }
        },
        {
          id: 'Q2',
          question: 'Discuss your approach to database indexing and query optimization in MongoDB when handling millions of candidate applications and vector searches.',
          answer: 'For transactional queries, I establish compound indexes that match query predicate equality, sort, and range (ESR rule), such as { candidateId: 1, status: 1, appliedAt: -1 }. For vector similarity search, I configure an Atlas Vector Search HNSW index with cosine similarity on a 768-dimension embedding field, pre-filtered with authorization metadata (recruiterId/companyId) to prevent cross-tenant data leakage.',
          evaluation: {
            relevance: 5,
            technicalUnderstanding: 4.8,
            completeness: 4.5,
            clarity: 5,
            feedback: 'Nuanced answer showing clear grasp of compound index ordering and vector search partition filtering.'
          }
        },
        {
          id: 'Q3',
          question: 'How do you safeguard sensitive authentication tokens against XSS and CSRF in modern single-page applications? Compare HTTP-only cookies with bearer tokens.',
          answer: 'HTTP-only cookies mitigate script-based token extraction because client JavaScript cannot read the document.cookie payload. To prevent CSRF attacks, cookies must be configured with SameSite=Lax (or Strict) alongside CSRF anti-forgery tokens for state-changing POST/PATCH mutations. In contrast, storing bearer JWTs in localStorage leaves them vulnerable to any third-party script injection.',
          evaluation: {
            relevance: 5,
            technicalUnderstanding: 4.9,
            completeness: 4.7,
            clarity: 4.8,
            feedback: 'Authoritative explanation of defense-in-depth web security patterns.'
          }
        },
        {
          id: 'Q4',
          question: 'Explain how you implement Redis caching strategies (e.g., Cache-Aside, Write-Through) in a Node.js REST API while ensuring strong cache invalidation consistency.',
          answer: 'I typically implement Cache-Aside: read queries first inspect Redis via a deterministic key (e.g. "recruiter_overview_{id}"). On cache miss, fetch from MongoDB, populate Redis with a TTL, and return. On updates, I utilize atomic invalidation (del key) alongside database transactions to guarantee cache freshness without stale read hazards.',
          evaluation: {
            relevance: 4.8,
            technicalUnderstanding: 4.6,
            completeness: 4.4,
            clarity: 4.8,
            feedback: 'Sound strategy. Candidate correctly addresses cache invalidation trade-offs and race condition prevention.'
          }
        },
        {
          id: 'Q5',
          question: 'Describe how you maintain 90%+ code coverage without writing brittle tests that break on minor refactoring.',
          answer: 'I focus tests on interface contracts rather than internal implementation details. Using Supertest for integration tests allows testing realistic HTTP requests against Express endpoints with an embedded database, ensuring business logic and authorization behave correctly under real conditions.',
          evaluation: {
            relevance: 4.9,
            technicalUnderstanding: 4.7,
            completeness: 4.8,
            clarity: 4.9,
            feedback: 'Strong testing philosophy emphasizing integration confidence and regression safety.'
          }
        }
      ],
      overallEvaluation: {
        score: 94,
        recommendation: 'Strong Hire',
        summary: 'Sarah demonstrated exceptional mastery across modern full-stack engineering, React concurrent architecture, database indexing, and API security. Outstanding technical candidate for the platform engineering pod.',
        strengths: [
          'High architectural rigor regarding React 18 concurrency and WebSocket stream batching',
          'Production-tested perspective on MongoDB compound indexing and security isolation',
          'Crisp, articulate technical communication with pragmatic trade-off awareness'
        ],
        weakAreas: [
          'Could elaborate more on distributed tracing instrumentation (e.g., OpenTelemetry span propagation)'
        ],
        technicalAssessment: 'Exceptional senior-level hire. Highly recommended for immediate offer.'
      },
      notes: [
        {
          authorName: 'Eleanor Vance',
          role: 'Talent Director',
          content: 'Hiring committee unanimously aligned on Strong Hire. Compensation band confirmed for Senior Full-Stack role.',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        }
      ],
      status: 'completed',
      startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000)
    });

    // 9. Create RAG Documents for Vector Search
    await Document.create({
      ownerId: recruiter._id,
      sourceType: 'resume',
      sourceId: resume1._id,
      title: `${candidate1.name}'s Resume`,
      content: sarahResumeText,
      embedding: generatePseudoEmbedding(sarahResumeText),
      metadata: {
        candidateId: candidate1._id,
        candidateName: candidate1.name,
        jobId: job1._id,
        jobTitle: job1.title,
        companyId: company._id,
        recruiterId: recruiter._id,
        documentType: 'resume',
        chunkIndex: 0
      }
    });

    await Document.create({
      ownerId: recruiter._id,
      sourceType: 'job',
      sourceId: job1._id,
      title: job1.title,
      content: `Job Requisition: ${job1.title}\nDepartment: ${job1.department}\nRequired Skills: ${job1.requiredSkills.join(', ')}\nDescription: ${job1.description}\nResponsibilities: ${job1.responsibilities.join(' ')}`,
      embedding: generatePseudoEmbedding(job1.title + ' ' + job1.description),
      metadata: {
        jobId: job1._id,
        jobTitle: job1.title,
        companyId: company._id,
        recruiterId: recruiter._id,
        documentType: 'job',
        chunkIndex: 0
      }
    });

    // 10. Create RAG Thread
    await Thread.create({
      recruiterId: recruiter._id,
      requisitionId: job1._id,
      title: 'React & Node.js candidate query',
      messages: [
        {
          sender: 'user',
          content: 'Which candidates have strong React and Node.js experience for Senior Full-Stack Engineer (#REQ-1042)?',
          sources: [],
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        {
          sender: 'assistant',
          content: 'Based on your candidate database for **Senior Full-Stack Engineer (#REQ-1042)**:\n\n' +
            '1. **Sarah Jenkins** is your top-scoring applicant with a **94% algorithmic match**.\n' +
            '- She brings 7+ years of hands-on production experience in React 18, Node.js, and MongoDB.\n' +
            '- Her technical assessment scorecard is completed with a **Strong Hire** rating.\n\n' +
            '2. **Marcus Vance** is also shortlisted with an **88% match**, offering exceptional backend systems and database indexing expertise.',
          sources: [
            {
              type: 'resume',
              sourceId: resume1._id.toString(),
              title: "Sarah Jenkins's Resume",
              candidateId: candidate1._id.toString(),
              candidateName: 'Sarah Jenkins',
              snippet: 'Accomplished Senior Full-Stack Engineer with 7+ years specializing in high-throughput React/Node.js web architectures...',
              score: 0.96
            }
          ],
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 30 * 1000)
        }
      ]
    });

    // 11. Create Notifications
    await Notification.create({
      userId: recruiter._id,
      type: 'interview_completed',
      title: 'Technical Assessment Completed',
      message: 'Sarah Jenkins completed the technical evaluation for Senior Full-Stack Engineer. Overall Score: 94/100 (Strong Hire).',
      referenceId: interview1._id,
      referenceType: 'interview',
      isRead: false
    });

    await Notification.create({
      userId: candidate1._id,
      type: 'application_status',
      title: 'Assessment Evaluated',
      message: 'Your technical assessment scorecard has been reviewed by LinearScale AI with top evaluation ratings.',
      referenceId: app1._id,
      referenceType: 'application',
      isRead: false
    });

    logger.info('Demo seed data successfully generated!');
  } catch (err) {
    logger.error(`Error during seedData: ${err.message}`, { stack: err.stack });
  }
};

module.exports = seedData;
