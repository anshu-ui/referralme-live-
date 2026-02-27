# ReferralMe - Professional Networking Platform

## Overview
ReferralMe is a full-stack web application designed to connect job seekers with industry professionals through a streamlined referral system. The platform facilitates job opportunity postings by referrers and referral requests from job seekers. Its core purpose is to simplify professional networking, making it easier for individuals to find job opportunities through trusted referrals and for professionals to share opportunities within their networks. The project aims to become a leading platform for career acceleration in India, fostering a community of mutually beneficial professional connections.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

The application employs a modern full-stack architecture with distinct client and server components, emphasizing scalability, maintainability, and user experience.

### Frontend Architecture
- **Technology Stack**: React 18 with TypeScript for robust type checking.
- **Build & Routing**: Vite for fast development and Wouter for lightweight client-side routing.
- **Styling**: TailwindCSS with `shadcn/ui` for a consistent, utility-first, and accessible design system.
- **State Management**: TanStack Query manages server state, caching, and API interactions, ensuring efficient data fetching.
- **Form Handling**: React Hook Form coupled with Zod for powerful, type-safe form validation.
- **UI/UX Decisions**: Emphasizes clean, modern aesthetics with a blue, white, and black color scheme. Features include smooth animations, responsive layouts for mobile and desktop, and a professional typography choice (system fonts like San Francisco, Segoe UI, Roboto). Accessible component primitives are sourced from Radix UI.

### Backend Architecture
- **Technology Stack**: Express.js server developed in TypeScript.
- **API Design**: Adheres to a RESTful API pattern for clear and organized endpoints.
- **Database**: PostgreSQL is utilized, with Drizzle ORM providing type-safe query building and schema management. Neon Database serves as the serverless PostgreSQL provider.
- **Authentication**: Integrates Replit Auth via OpenID Connect, complemented by Express Sessions with PostgreSQL session storage for robust, session-based authentication.

### Key Features & System Design
- **Authentication System**: Secure user authentication via Replit OAuth, supporting 'seeker' and 'referrer' roles with protected routes.
- **Database Schema**: Core tables include `users`, `job_postings`, `referral_requests`, and `sessions`, with defined one-to-many and many-to-many relationships ensuring data integrity.
- **User Experience Flows**: Structured flows for authentication, role selection, and distinct referrer/seeker dashboards. Includes comprehensive request management (pending, accepted, rejected, completed).
- **Data Flow**: Features a clear client-server communication via RESTful APIs, with TanStack Query handling caching and updates. Drizzle ORM facilitates type-safe database operations.
- **Marketplace & Monetization**: Includes a mentorship marketplace with Razorpay payment gateway integration for direct mentor payments (marketplace model) and Daily.co for video calling. Mentorship activation is decoupled from immediate payment setup.
- **Analytics**: Comprehensive Google Analytics integration for tracking user behavior, and a real-time analytics system for dashboard metrics drawing from authentic application data.
- **Email Automation**: Implemented a complete email system (migrated from SendGrid to Brevo) for welcome emails, application notifications, and status updates, designed for production reliability.
- **Viral Referral System**: Built-in system for unique code generation, tracking, and rewards to foster platform growth.
- **ATS Integration**: Integration with Teal HQ ATS for resume analysis, scoring, and detailed feedback within the application process.
- **LinkedIn Sharing**: Advanced LinkedIn article generation and sharing functionality, pre-filling job details for seamless social media promotion.
- **AI Job Description Generation**: Offline AI generator for job descriptions, integrated directly into the job posting form.
- **Legal & Branding**: Comprehensive legal compliance (Indian IT Act) and a distinct two-tone "ReferralMe" brand identity.

## External Dependencies

- **Platform & Database Hosting**:
    - **Replit Platform**: Primary hosting and development environment.
    - **Neon Database**: Serverless PostgreSQL hosting.
- **Authentication**:
    - **Replit Auth**: OpenID Connect provider for user authentication.
- **Payment Gateway**:
    - **Razorpay**: For secure payment processing, especially for the mentorship marketplace.
- **Video Conferencing**:
    - **Daily.co**: For video calling functionality in mentorship sessions.
- **Email Service**:
    - **Brevo**: (Formerly SendGrid) For transactional email automation.
- **Analytics**:
    - **Google Analytics**: For comprehensive user behavior tracking.
- **UI/UX Libraries**:
    - **Radix UI**: Accessible component primitives.
    - **Lucide React**: Icon library.
    - **TailwindCSS**: Utility-first CSS framework.
    - **shadcn/ui**: Pre-built component library for consistent design.
- **Development Tools**:
    - **Vite**: Fast development server and build tool.
    - **TypeScript**: For type safety across the application.
    - **ESBuild**: Used for bundling the backend server for production.