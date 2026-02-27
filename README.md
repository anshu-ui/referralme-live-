# ReferralMe - Professional Networking Platform

A cutting-edge referral platform that connects job seekers with industry professionals through intelligent matching and collaborative tools.

![ReferralMe Logo](./attached_assets/logo1_1752126827834.png)

## 🚀 Features

- **Dual Dashboard System**: Separate interfaces for job seekers and referrers
- **Firebase Authentication**: Secure Google OAuth integration
- **Real-time Job Posting**: Post and manage job opportunities instantly
- **Referral Request System**: Streamlined request and approval workflow
- **File Upload Support**: Resume and document handling
- **Mobile-First Design**: Responsive across all devices
- **Professional UI**: Clean, modern interface with custom branding

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for development and building
- **TailwindCSS** + **shadcn/ui** for styling
- **TanStack Query** for state management
- **Wouter** for routing
- **React Hook Form** + **Zod** for form validation

### Backend
- **Express.js** with TypeScript
- **Firebase Auth** for authentication
- **Firestore** for database
- **Multer** for file uploads
- **PostgreSQL** support (optional)

### Infrastructure
- **Firebase** (Auth + Firestore)
- **Replit** for hosting and development
- **Neon Database** (PostgreSQL alternative)

## 📋 Prerequisites

- Node.js 18 or higher
- npm or yarn
- Firebase account
- Git

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/anshu-ui/replit-referralme.git
cd replit-referralme
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

```bash
cp .env.example .env
```

Edit `.env` with your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id_here
VITE_FIREBASE_APP_ID=your_firebase_app_id_here
```

### 4. Firebase Configuration

1. **Create Firebase Project**: Go to [Firebase Console](https://console.firebase.google.com/)
2. **Enable Authentication**: 
   - Go to Authentication > Sign-in method
   - Enable Google provider
   - Add your domain to authorized domains
3. **Create Firestore Database**: 
   - Go to Firestore Database
   - Create database in test mode
4. **Get Configuration**:
   - Go to Project Settings > General
   - Copy API Key, Project ID, and App ID

### 5. Run Development Server

```bash
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5000
- **Full App**: http://localhost:5000

## 📁 Project Structure

```
replit-referralme/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and configurations
│   │   └── App.tsx        # Main application component
├── server/                # Express backend
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Database operations
│   ├── firebaseAuth.ts    # Firebase authentication
│   └── index.ts           # Server entry point
├── shared/                # Shared types and schemas
│   └── schema.ts          # Database schema and types
├── attached_assets/       # Logo and branding assets
├── uploads/              # File upload directory
├── README.md             # This file
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore rules
└── package.json          # Dependencies and scripts
```

## 🔧 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Database operations (PostgreSQL)
npm run db:push
npm run db:studio

# Type checking
npm run type-check
```

## 🌐 Deployment

### Replit Deployment
1. Fork this project on Replit
2. Set environment variables in Replit Secrets
3. Click "Deploy" button

### Manual Deployment
1. Build the project: `npm run build`
2. Deploy `dist/` folder to your hosting provider
3. Set environment variables on your hosting platform

## 🎯 User Roles

### Job Seekers
- Browse job opportunities
- Submit referral requests
- Track application status
- Manage profile information

### Referrers
- Post job opportunities
- Review referral requests
- Manage job listings
- View statistics and analytics

## 🔐 Authentication Flow

1. User clicks "Sign in with Google"
2. Firebase handles OAuth authentication
3. User selects role (Seeker/Referrer)
4. Redirect to appropriate dashboard
5. Session maintained across visits

## 📊 Database Schema

### Users Collection (Firestore)
```typescript
{
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'seeker' | 'referrer';
  company?: string;
  designation?: string;
  experience?: string;
  bio?: string;
  skills?: string[];
  location?: string;
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

### Job Postings Collection (Firestore)
```typescript
{
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string;
  compensation: string;
  referrerId: string;
  isActive: boolean;
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

### Referral Requests Collection (Firestore)
```typescript
{
  id: string;
  jobPostingId: string;
  seekerId: string;
  referrerId: string;
  motivation: string;
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead';
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

## 🚨 Common Issues

### Firebase Authentication Errors
- Ensure authorized domains are configured in Firebase Console
- Check API keys are correctly set in environment variables
- Verify Firebase project settings

### Development Server Issues
- Port conflicts: Change ports in `package.json` scripts
- Module resolution: Clear `node_modules` and reinstall
- Type errors: Run `npm run type-check`

## 📝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ in India
- Firebase for authentication and database
- shadcn/ui for beautiful components
- TailwindCSS for styling
- React and Vite for development experience

## 📞 Support

For support and questions:
- Create an issue in this repository
- Contact: [Your Email]
- Documentation: This README

---

**Built with ❤️ for the developer community**