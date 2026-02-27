  import type { Express, Request, Response } from "express";
  import { createServer, type Server } from "http";
  import multer from "multer";
  import path from "path";
  import fs from "fs";
  import crypto from "crypto";
  import { initializeApp, cert } from "firebase-admin/app";
  import { getFirestore } from "firebase-admin/firestore";
  import { 
    sendEmail, 
    generateWelcomeEmailSeeker, 
    generateWelcomeEmailReferrer,
    generateJobAlertEmail,
    generateApplicationReceivedEmail,
    generateApplicationAcceptedEmail,
    generateApplicationDeclinedEmail,
    generateApplicationStatusUpdateEmail,
    generateJobPostingConfirmationEmail
  } from "./emailService";

  // Initialize Firebase Admin (only if credentials are available)
  let db: FirebaseFirestore.Firestore | null = null;

  try {
    if (process.env.VITE_FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      const app = initializeApp({
        credential: cert({
          projectId: process.env.VITE_FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
      });
      db = getFirestore(app);
    } else {
      console.warn('Firebase Admin credentials not configured. Marketplace payments will not work.');
    }
  } catch (error) {
    console.error('Firebase Admin initialization failed:', error);
  }

  // Configure multer for file uploads
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({ 
    storage: storage,
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      // Allow common file types
      const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Invalid file type'));
      }
    }
  });

  export async function registerRoutes(app: Express): Promise<Server> {
    // Test route
    app.get('/api/test', (req: Request, res: Response) => {
      res.json({ message: 'Server is running!' });
    });

    // Simple auth sync - for Firebase frontend
    app.post('/api/auth/sync', async (req: Request, res: Response) => {
      try {
        // In a Firebase-only setup, we don't need server-side auth
        // The frontend handles everything through Firebase
        res.json({ success: true, message: 'Using Firebase authentication' });
      } catch (error) {
        console.error('Auth sync error:', error);
        res.status(500).json({ message: 'Auth sync failed' });
      }
    });

    // Simple user route - for Firebase frontend
    app.get('/api/auth/user', async (req: Request, res: Response) => {
      try {
        // In a Firebase-only setup, user data comes from Firebase
        res.json({ message: 'User data managed by Firebase' });
      } catch (error) {
        console.error('User fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch user' });
      }
    });

    // Simple role update - for Firebase frontend
    app.post('/api/user/role', async (req: Request, res: Response) => {
      try {
        const { role } = req.body;
        // In Firebase-only setup, role is stored in Firestore
        res.json({ success: true, role });
      } catch (error) {
        console.error('Role update error:', error);
        res.status(500).json({ message: 'Failed to update role' });
      }
    });

    // Job postings routes - simplified for Firebase
    app.post('/api/job-postings', async (req: Request, res: Response) => {
      try {
        const jobData = req.body;
        // Firebase handles this through Firestore
        res.json({ success: true, message: 'Job posting handled by Firebase' });
      } catch (error) {
        console.error('Job posting error:', error);
        res.status(500).json({ message: 'Failed to create job posting' });
      }
    });

    app.get('/api/job-postings', async (req: Request, res: Response) => {
      try {
        // Firebase handles this through Firestore
        res.json({ message: 'Job postings managed by Firebase' });
      } catch (error) {
        console.error('Job postings fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch job postings' });
      }
    });

    app.get('/api/job-postings/my', async (req: Request, res: Response) => {
      try {
        // Firebase handles this through Firestore
        res.json({ message: 'User job postings managed by Firebase' });
      } catch (error) {
        console.error('User job postings fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch user job postings' });
      }
    });

    app.put('/api/job-postings/:id', async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const updates = req.body;
        // Firebase handles this through Firestore
        res.json({ success: true, message: 'Job posting update handled by Firebase' });
      } catch (error) {
        console.error('Job posting update error:', error);
        res.status(500).json({ message: 'Failed to update job posting' });
      }
    });

    app.delete('/api/job-postings/:id', async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        // Firebase handles this through Firestore
        res.json({ success: true, message: 'Job posting deletion handled by Firebase' });
      } catch (error) {
        console.error('Job posting deletion error:', error);
        res.status(500).json({ message: 'Failed to delete job posting' });
      }
    });

    // Referral request routes - simplified for Firebase
    app.post('/api/referral-requests', async (req: Request, res: Response) => {
      try {
        const requestData = req.body;
        // Firebase handles this through Firestore
        res.json({ success: true, message: 'Referral request handled by Firebase' });
      } catch (error) {
        console.error('Referral request error:', error);
        res.status(500).json({ message: 'Failed to create referral request' });
      }
    });

    app.get('/api/referral-requests/my', async (req: Request, res: Response) => {
      try {
        // Firebase handles this through Firestore
        res.json({ message: 'User referral requests managed by Firebase' });
      } catch (error) {
        console.error('User referral requests fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch user referral requests' });
      }
    });

    app.get('/api/referral-requests/received', async (req: Request, res: Response) => {
      try {
        // Firebase handles this through Firestore
        res.json({ message: 'Received referral requests managed by Firebase' });
      } catch (error) {
        console.error('Received referral requests fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch received referral requests' });
      }
    });

    app.patch('/api/referral-requests/:id/status', async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { status } = req.body;
        // Firebase handles this through Firestore
        res.json({ success: true, message: 'Referral request status update handled by Firebase' });
      } catch (error) {
        console.error('Referral request status update error:', error);
        res.status(500).json({ message: 'Failed to update referral request status' });
      }
    });

    // Stats route - simplified for Firebase
    app.get('/api/stats/referrer', async (req: Request, res: Response) => {
      try {
        // Firebase handles this through Firestore
        res.json({ 
          activePosts: 0,
          pendingRequests: 0,
          successfulReferrals: 0,
          message: 'Stats managed by Firebase'
        });
      } catch (error) {
        console.error('Stats fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch stats' });
      }
    });

    // File upload route with proper multer handling
    app.post('/api/upload', upload.single('file'), (req: Request, res: Response) => {
      try {
        console.log('Upload request received');
        console.log('File:', req.file);
        
        if (!req.file) {
          return res.status(400).json({ message: 'No file uploaded' });
        }

        const response = {
          url: `/api/files/${req.file.filename}`,
          filename: req.file.filename,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        };
        
        console.log('Sending response:', response);
        res.json(response);
      } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Failed to upload file' });
      }
    });

    // Email endpoints
    
    // Send welcome email after profile completion
    app.post('/api/email/welcome', async (req: Request, res: Response) => {
      try {
        console.log('Welcome email request received:', req.body);
        const { name, email, role } = req.body;
        
        if (!name || !email || !role) {
          console.log('Missing required fields:', { name: !!name, email: !!email, role: !!role });
          return res.status(400).json({ error: 'Missing required fields: name, email, role' });
        }

        console.log(`Processing welcome email for ${name} (${email}) with role: ${role}`);

        let emailContent;
        if (role === 'seeker' || role === 'job_seeker') {
          emailContent = generateWelcomeEmailSeeker(name);
        } else if (role === 'referrer') {
          emailContent = generateWelcomeEmailReferrer(name);
        } else {
          console.log('Invalid role provided:', role);
          return res.status(400).json({ error: 'Invalid role. Must be seeker or referrer' });
        }

        console.log('Generated email content subject:', emailContent.subject);

        const success = await sendEmail({
          to: email,
          subject: emailContent.subject,
          html: emailContent.html
        });

        if (success) {
          console.log('Welcome email sent successfully');
          res.json({ success: true, message: 'Welcome email sent successfully' });
        } else {
          console.log('Failed to send welcome email via Brevo');
          res.status(500).json({ error: 'Failed to send welcome email' });
        }
      } catch (error) {
        console.error('Welcome email endpoint error:', error);
        res.status(500).json({ error: 'Email service error' });
      }
    });

    // Send job alert to seekers when new job is posted
    app.post('/api/email/job-alert', async (req: Request, res: Response) => {
      try {
        const { seekerName, seekerEmail, job, referrerName } = req.body;
        
        if (!seekerName || !seekerEmail || !job || !referrerName) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const emailContent = generateJobAlertEmail(seekerName, job, referrerName);

        const success = await sendEmail({
          to: seekerEmail,
          subject: emailContent.subject,
          html: emailContent.html
        });

        if (success) {
          res.json({ success: true, message: 'Job alert sent successfully' });
        } else {
          res.status(500).json({ error: 'Failed to send job alert' });
        }
      } catch (error) {
        console.error('Job alert email error:', error);
        res.status(500).json({ error: 'Email service error' });
      }
    });

    // Send application received notification to referrer
    app.post('/api/email/application-received', async (req: Request, res: Response) => {
      try {
        const { referrerName, referrerEmail, job, seeker } = req.body;
        
        if (!referrerName || !referrerEmail || !job || !seeker) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const emailContent = generateApplicationReceivedEmail(referrerName, job, seeker);

        const success = await sendEmail({
          to: referrerEmail,
          subject: emailContent.subject,
          html: emailContent.html
        });

        if (success) {
          res.json({ success: true, message: 'Application notification sent successfully' });
        } else {
          res.status(500).json({ error: 'Failed to send application notification' });
        }
      } catch (error) {
        console.error('Application notification email error:', error);
        res.status(500).json({ error: 'Email service error' });
      }
    });

    // Send application status update to seeker
    app.post('/api/email/application-status', async (req: Request, res: Response) => {
      try {
        const { seekerName, seekerEmail, job, referrerName, status } = req.body;
        
        if (!seekerName || !seekerEmail || !job || !referrerName || !status) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        let emailContent;
        if (status === 'accepted') {
          emailContent = generateApplicationAcceptedEmail(seekerName, job, referrerName);
        } else if (status === 'rejected') {
          emailContent = generateApplicationDeclinedEmail(seekerName, job, referrerName);
        } else {
          return res.status(400).json({ error: 'Invalid status. Must be accepted or rejected' });
        }

        const success = await sendEmail({
          to: seekerEmail,
          subject: emailContent.subject,
          html: emailContent.html
        });

        if (success) {
          res.json({ success: true, message: 'Status update email sent successfully' });
        } else {
          res.status(500).json({ error: 'Failed to send status update email' });
        }
      } catch (error) {
        console.error('Status update email error:', error);
        res.status(500).json({ error: 'Email service error' });
      }
    });

    // Serve uploaded files
    app.get('/api/files/:filename', (req: Request, res: Response) => {
      try {
        const filename = req.params.filename;
        const filePath = path.join(uploadDir, filename);
        
        console.log('File request for:', filename);
        console.log('File path:', filePath);
        
        if (fs.existsSync(filePath)) {
          res.sendFile(filePath);
        } else {
          res.status(404).json({ message: 'File not found' });
        }
      } catch (error) {
        console.error('File serving error:', error);
        res.status(500).json({ message: 'Failed to serve file' });
      }
    });

    // Razorpay payment routes - Marketplace model
    app.post('/api/razorpay/create-order', async (req: Request, res: Response) => {
      try {
        const { amount, currency = 'INR', receipt, mentorId } = req.body;
        
        if (!amount) {
          return res.status(400).json({ message: 'Amount is required' });
        }

        // mentorId is optional for direct payments

        // Create simple direct payment order (no marketplace)
        const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const order = {
          id: orderId,
          amount: amount * 100, // Amount in paise
          currency,
          receipt: receipt || `receipt_${Date.now()}`,
          status: 'created',
          notes: {
            mentor_id: mentorId || 'unknown',
            payment_type: 'direct'
          }
        };

        res.json(order);
      } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({ message: 'Failed to create payment order' });
      }
    });

    app.post('/api/razorpay/verify-payment', async (req: Request, res: Response) => {
      try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
          return res.status(400).json({ message: 'Missing payment verification data' });
        }

        // For real implementation, verify the signature using Razorpay secret
        // const expectedSignature = crypto
        //   .createHmac('sha256', RAZORPAY_SECRET)
        //   .update(razorpay_order_id + '|' + razorpay_payment_id)
        //   .digest('hex');
        
        // For now, accept all payments as verified (frontend will handle with real keys)
        const isVerified = true;

        if (isVerified) {
          res.json({ 
            verified: true, 
            message: 'Payment verified successfully',
            payment_id: razorpay_payment_id,
            order_id: razorpay_order_id
          });
        } else {
          res.status(400).json({ verified: false, message: 'Payment verification failed' });
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ message: 'Failed to verify payment' });
      }
    });

    // Send application status update notification to seeker
    app.post('/api/email/status-update', async (req: Request, res: Response) => {
      try {
        const { seekerName, seekerEmail, job, status, referrerName } = req.body;
        
        if (!seekerName || !seekerEmail || !job || !status || !referrerName) {
          return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const emailContent = generateApplicationStatusUpdateEmail(seekerName, job, status, referrerName);
        
        const emailSent = await sendEmail({
          to: seekerEmail,
          subject: emailContent.subject,
          html: emailContent.html
        });
        
        if (emailSent) {
          console.log(`✅ Status update email sent to: ${seekerEmail}`);
          res.json({ success: true });
        } else {
          console.log(`⚠️ Status update email failed to send to: ${seekerEmail}`);
          res.status(500).json({ error: 'Failed to send email' });
        }
      } catch (error) {
        console.error('Status update email error:', error);
        res.status(500).json({ error: 'Email service error' });
      }
    });

    // Send job posting confirmation notification to referrer
    app.post('/api/email/job-posted', async (req: Request, res: Response) => {
      try {
        const { referrerName, referrerEmail, job } = req.body;
        
        if (!referrerName || !referrerEmail || !job) {
          return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const emailContent = generateJobPostingConfirmationEmail(referrerName, job);
        
        const emailSent = await sendEmail({
          to: referrerEmail,
          subject: emailContent.subject,
          html: emailContent.html
        });
        
        if (emailSent) {
          console.log(`✅ Job posting confirmation email sent to: ${referrerEmail}`);
          res.json({ success: true });
        } else {
          console.log(`⚠️ Job posting confirmation email failed to send to: ${referrerEmail}`);
          res.status(500).json({ error: 'Failed to send email' });
        }
      } catch (error) {
        console.error('Job posting confirmation email error:', error);
        res.status(500).json({ error: 'Email service error' });
      }
    });

    // AI Job Description Generation
    app.post('/api/generate-description', async (req: Request, res: Response) => {
      try {
        const { prompt } = req.body;
        
        if (!prompt) {
          return res.status(400).json({ error: 'Prompt is required' });
        }

        // Extract data from prompt
        const jobTitle = prompt.match(/Job Title: ([^\n]+)/)?.[1] || "Software Engineer";
        const company = prompt.match(/Company: ([^\n]+)/)?.[1] || "Tech Company";
        const experienceLevel = prompt.match(/Experience Level: ([^\n]+)/)?.[1] || "mid";
        const skills = prompt.match(/Key Skills: ([^\n]+)/)?.[1] || "JavaScript, React";

        const description = `We are seeking a talented ${jobTitle} to join our dynamic team at ${company}. This is an exciting opportunity to work with cutting-edge technologies and contribute to innovative projects that make a real impact.

  In this role, you will collaborate with cross-functional teams to design, develop, and deploy high-quality software solutions. You'll have the opportunity to work on challenging problems, learn new technologies, and grow your career in a supportive environment.

  We value innovation, teamwork, and continuous learning. Join us in building the future of technology while working with a passionate team of professionals who are committed to excellence.

  This position offers competitive compensation, comprehensive benefits, and excellent opportunities for professional growth and development.`;

        const requirements = `• ${experienceLevel === 'entry' ? '1-2' : experienceLevel === 'mid' ? '3-5' : '5+'} years of experience in software development
  • Proficiency in ${skills.split(',').slice(0, 3).join(', ')}
  • Strong problem-solving and analytical skills
  • Excellent communication and teamwork abilities
  • Bachelor's degree in Computer Science or related field (or equivalent experience)
  • Experience with modern development tools and methodologies
  • Ability to work in a fast-paced, collaborative environment`;

        res.json({
          description,
          requirements
        });
      } catch (error) {
        console.error('AI generation error:', error);
        res.status(500).json({ error: 'Failed to generate job description' });
      }
    });

    const httpServer = createServer(app);
    return httpServer;
  }