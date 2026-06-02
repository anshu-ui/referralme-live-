  import type { Express, Request, Response } from "express";
  import { createServer, type Server } from "http";
  import multer from "multer";
  import path from "path";
  import fs from "fs";
  import crypto from "crypto";
  import Razorpay from "razorpay";
  import { GoogleGenAI } from "@google/genai";
  import { generateLiteChat, generateLiteInterviewPack, generateLitePlan, generateLiteReferralDm, generateLiteResumeRewrite } from "./mentorLite";
  import mammoth from "mammoth";
  import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
  import { initializeApp, cert } from "firebase-admin/app";
  import { getFirestore } from "firebase-admin/firestore";
  import { 
    sendEmail, 
    generateSignupStartedEmail,
    generateWelcomeEmailSeeker, 
    generateWelcomeEmailReferrer,
    generateJobAlertEmail,
    generateApplicationReceivedEmail,
    generateApplicationAcceptedEmail,
    generateApplicationDeclinedEmail,
    generateApplicationStatusUpdateEmail,
    generateJobPostingConfirmationEmail,
    generatePlatformAnnouncementEmail,
    generateCampusAmbassadorApplicationReceivedEmail,
    generateCampusAmbassadorAcceptedEmail,
    generateCampusAmbassadorShortlistedEmail,
    generateCampusProofReviewedEmail,
    generateCampusRewardUnlockedEmail,
    generateCampusWeeklyDigestEmail,
    generateMentorshipAdminEventEmail,
    generateMentorshipCompletedEmail,
    generateMentorshipConfirmedEmail,
    generateMentorshipManualPaymentPendingMentorEmail,
    generateMentorshipManualPaymentSubmittedEmail,
    generateMentorshipNewRequestEmail,
    generateMentorshipPaymentReceivedEmail,
    generateMentorshipRatingReceivedEmail,
  } from "./emailService";

  // Initialize Firebase Admin (only if credentials are available)
  let db: FirebaseFirestore.Firestore | null = null;
  const getRazorpayClient = () => {
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET || process.env.VITE_RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return null;
    return new Razorpay({ key_id: keyId, key_secret: keySecret });
  };

  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
  };

  const getCashfreeConfig = () => {
    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;
    const envRaw = String(process.env.CASHFREE_ENV || "").trim().toLowerCase();
    // If CASHFREE_ENV isn't provided, infer it from the secret key prefix.
    // Production keys typically contain `_prod_` (example: `cfsk_ma_prod_...`).
    const inferred: "sandbox" | "production" =
      secretKey && /_prod_/i.test(secretKey) ? "production" : "sandbox";
    const env: "sandbox" | "production" =
      envRaw === "production" || envRaw === "prod"
        ? "production"
        : envRaw === "sandbox" || envRaw === "test"
          ? "sandbox"
          : inferred;
    if (!appId || !secretKey) return null;
    return { appId, secretKey, env };
  };

  const cashfreeBaseUrl = (env: "sandbox" | "production") =>
    env === "production" ? "https://api.cashfree.com" : "https://sandbox.cashfree.com";

  const GEMINI_MENTOR_MODEL =
    process.env.GEMINI_MODEL ||
    "gemini-2.0-flash";

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const OPENAI_MODEL_CANDIDATES = [
    process.env.OPENAI_MODEL,
    "gpt-4.1-mini",
    "gpt-4.1",
  ].filter(Boolean) as string[];

  const createOpenAIResponse = async (args: {
    instructions: string;
    input: string;
  }) => {
    if (!OPENAI_API_KEY) return null;

    let lastErr: any = null;
    for (const model of OPENAI_MODEL_CANDIDATES) {
      try {
        const resp = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model,
            instructions: args.instructions,
            input: args.input,
          }),
        });

        const data: any = await resp.json().catch(() => null);
        if (!resp.ok) {
          const msg = data?.error?.message || data?.message || `OpenAI error (${resp.status})`;
          const code = data?.error?.code || resp.status;
          const err: any = new Error(msg);
          err.status = resp.status;
          err.code = code;
          throw err;
        }

        // Common fields: output_text (convenience) or output items.
        const text =
          data?.output_text ||
          data?.output?.map?.((o: any) => o?.content?.map?.((c: any) => c?.text || "").join("") || "").join("\n") ||
          "";
        return String(text || "").trim();
      } catch (e: any) {
        lastErr = e;
        const msg = e?.message ? String(e.message) : String(e);
        // If model doesn't exist / not allowed, try next.
        if (msg.toLowerCase().includes("model") && (msg.includes("not found") || msg.includes("does not exist"))) {
          continue;
        }
        throw e;
      }
    }
    if (lastErr) throw lastErr;
    return null;
  };

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
      const allowedExtensions = new Set([".jpeg", ".jpg", ".png", ".gif", ".pdf", ".doc", ".docx", ".txt"]);
      const allowedMimeTypes = new Set([
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ]);

      const extension = path.extname(file.originalname).toLowerCase();
      const hasAllowedExtension = allowedExtensions.has(extension);
      const hasAllowedMimeType = allowedMimeTypes.has(file.mimetype);

      if (hasAllowedExtension && hasAllowedMimeType) {
        return cb(null, true);
      } else {
        cb(new Error('Invalid file type'));
      }
    }
  });

  async function extractUploadedText(filePath: string, mimetype: string, originalname: string) {
    const extension = path.extname(originalname).toLowerCase();

    if (mimetype === "text/plain" || extension === ".txt") {
      return fs.readFileSync(filePath, "utf8").trim();
    }

    if (
      mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimetype === "application/msword" ||
      extension === ".docx" ||
      extension === ".doc"
    ) {
      const { value } = await mammoth.extractRawText({ path: filePath });
      return value.trim();
    }

    if (mimetype === "application/pdf" || extension === ".pdf") {
      const buffer = fs.readFileSync(filePath);
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      let text = "";

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => ("str" in item ? item.str : ""))
          .join(" ")
          .trim();
        text += `${pageText}\n`;
      }

      return text.trim();
    }

    return "";
  }

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

        extractUploadedText(path.join(uploadDir, req.file.filename), req.file.mimetype, req.file.originalname)
          .then((extractedText) => {
            const response = {
              url: `/api/files/${req.file!.filename}`,
              filename: req.file!.filename,
              originalname: req.file!.originalname,
              mimetype: req.file!.mimetype,
              size: req.file!.size,
              extractedText,
            };

            console.log('Sending response:', { ...response, extractedText: extractedText ? "[present]" : "[empty]" });
            res.json(response);
          })
          .catch((error) => {
            console.error('Text extraction error:', error);
            const response = {
              url: `/api/files/${req.file!.filename}`,
              filename: req.file!.filename,
              originalname: req.file!.originalname,
              mimetype: req.file!.mimetype,
              size: req.file!.size,
              extractedText: "",
            };
            res.json(response);
          });
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

    // Send initial signup email right after account creation
    app.post('/api/email/signup-started', async (req: Request, res: Response) => {
      try {
        const { name, email } = req.body;

        if (!name || !email) {
          return res.status(400).json({ error: 'Missing required fields: name, email' });
        }

        const emailContent = generateSignupStartedEmail(name);
        const success = await sendEmail({
          to: email,
          subject: emailContent.subject,
          html: emailContent.html,
        });

        if (success) {
          res.json({ success: true, message: 'Signup email sent successfully' });
        } else {
          res.status(500).json({ error: 'Failed to send signup email' });
        }
      } catch (error) {
        console.error('Signup email endpoint error:', error);
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

    app.post('/api/email/campus-application-received', async (req: Request, res: Response) => {
      try {
        const { name, email } = req.body;

        if (!name || !email) {
          return res.status(400).json({ error: 'Missing required fields: name, email' });
        }

        const emailContent = generateCampusAmbassadorApplicationReceivedEmail(name);
        const success = await sendEmail({
          to: email,
          subject: emailContent.subject,
          html: emailContent.html,
        });

        if (success) {
          return res.json({ success: true, message: 'Campus application received email sent successfully' });
        }

        return res.status(500).json({ error: 'Failed to send campus application received email' });
      } catch (error) {
        console.error('Campus application received email error:', error);
        return res.status(500).json({ error: 'Email service error' });
      }
    });

    app.post('/api/email/campus-proof-reviewed', async (req: Request, res: Response) => {
      try {
        const { name, email, taskTitle, status, pointsAwarded, reviewNote, dashboardUrl } = req.body;

        if (!name || !email || !taskTitle || !status) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        if (status !== 'approved' && status !== 'rejected') {
          return res.status(400).json({ error: 'Invalid status. Must be approved or rejected' });
        }

        const emailContent = generateCampusProofReviewedEmail({
          name,
          taskTitle,
          status,
          pointsAwarded: Number(pointsAwarded || 0),
          reviewNote,
          dashboardUrl,
        });

        const success = await sendEmail({
          to: email,
          subject: emailContent.subject,
          html: emailContent.html,
        });

        if (success) {
          return res.json({ success: true, message: 'Campus proof review email sent successfully' });
        }

        return res.status(500).json({ error: 'Failed to send campus proof review email' });
      } catch (error) {
        console.error('Campus proof review email error:', error);
        return res.status(500).json({ error: 'Email service error' });
      }
    });

    app.post('/api/email/campus-reward-unlocked', async (req: Request, res: Response) => {
      try {
        const { name, email, rewardTitle, rewardDescription, currentPoints, dashboardUrl } = req.body;

        if (!name || !email || !rewardTitle) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const emailContent = generateCampusRewardUnlockedEmail({
          name,
          rewardTitle,
          rewardDescription,
          currentPoints: Number(currentPoints || 0),
          dashboardUrl,
        });

        const success = await sendEmail({
          to: email,
          subject: emailContent.subject,
          html: emailContent.html,
        });

        if (success) {
          return res.json({ success: true, message: 'Campus reward unlocked email sent successfully' });
        }

        return res.status(500).json({ error: 'Failed to send campus reward unlocked email' });
      } catch (error) {
        console.error('Campus reward unlocked email error:', error);
        return res.status(500).json({ error: 'Email service error' });
      }
    });

    app.post('/api/email/campus-weekly-digest', async (req: Request, res: Response) => {
      try {
        const { recipients, activeTasks = [], activeAnnouncements = [], dashboardUrl } = req.body;

        if (!Array.isArray(recipients) || recipients.length === 0) {
          return res.status(400).json({ error: 'Missing recipients' });
        }

        const results = await Promise.all(
          recipients.map(async (recipient: any) => {
            if (!recipient?.name || !recipient?.email) {
              return false;
            }

            const emailContent = generateCampusWeeklyDigestEmail({
              name: recipient.name,
              currentPoints: Number(recipient.currentPoints || 0),
              activeTasks,
              activeAnnouncements,
              dashboardUrl,
            });

            return sendEmail({
              to: recipient.email,
              subject: emailContent.subject,
              html: emailContent.html,
            });
          }),
        );

        const sent = results.filter(Boolean).length;
        const failed = results.length - sent;
        return res.json({ success: failed === 0, sent, failed });
      } catch (error) {
        console.error('Campus weekly digest email error:', error);
        return res.status(500).json({ error: 'Email service error' });
      }
    });

    // ========================================
    // Mentorship emails
    // ========================================
    const getAdminEmail = () => process.env.ADMIN_EMAIL || process.env.EMAIL_FROM || "info@referralme.in";

    app.post("/api/email/mentorship-booked", async (req: Request, res: Response) => {
      try {
        const {
          sessionId,
          menteeName,
          menteeEmail,
          mentorName,
          mentorEmail,
          title,
          scheduledAt,
          duration,
          price,
          paymentMode,
          upiId,
          paymentReference,
          paymentProofNote,
        } = req.body || {};
        if (!menteeName || !menteeEmail || !mentorName || !mentorEmail || !title || !scheduledAt || !duration || !price) {
          return res.status(400).json({ error: "Missing required fields" });
        }

        const scheduledAtLabel = new Date(scheduledAt).toLocaleString();
        const priceInr = Number(price || 0);
        const durationMinutes = Number(duration || 0);
        const isManualUpi = paymentMode === "manual_upi";

        const menteeEmailContent = isManualUpi
          ? generateMentorshipManualPaymentSubmittedEmail({
              menteeName,
              mentorName,
              title,
              scheduledAtLabel,
              priceInr,
              upiId: String(upiId || ""),
              paymentReference: paymentReference ? String(paymentReference) : undefined,
            })
          : generateMentorshipPaymentReceivedEmail({
              menteeName,
              mentorName,
              title,
              scheduledAtLabel,
              priceInr,
            });
        const mentorEmailContent = isManualUpi
          ? generateMentorshipManualPaymentPendingMentorEmail({
              mentorName,
              menteeName,
              title,
              scheduledAtLabel,
              durationMinutes,
              priceInr,
            })
          : generateMentorshipNewRequestEmail({
              mentorName,
              mentorEmail,
              menteeName,
              title,
              scheduledAtLabel,
              durationMinutes,
              priceInr,
            });
        const adminEmailContent = generateMentorshipAdminEventEmail({
          event: isManualUpi ? "manual_payment_submitted" : "booked",
          mentorName,
          mentorEmail,
          menteeName,
          menteeEmail,
          title,
          scheduledAtLabel,
          priceInr,
          sessionId,
          upiId: isManualUpi ? String(upiId || "") : undefined,
          paymentReference: paymentReference ? String(paymentReference) : undefined,
          paymentProofNote: paymentProofNote ? String(paymentProofNote) : undefined,
        });

        const results = await Promise.all([
          sendEmail({ to: menteeEmail, subject: menteeEmailContent.subject, html: menteeEmailContent.html }),
          sendEmail({ to: mentorEmail, subject: mentorEmailContent.subject, html: mentorEmailContent.html }),
          sendEmail({ to: getAdminEmail(), subject: adminEmailContent.subject, html: adminEmailContent.html }),
        ]);

        const success = results.filter(Boolean).length;
        return res.json({ success: success >= 2, sent: success, failed: results.length - success });
      } catch (error) {
        console.error("Mentorship booked email error:", error);
        return res.status(500).json({ error: "Email service error" });
      }
    });

    app.post("/api/email/mentorship-payment-verified", async (req: Request, res: Response) => {
      try {
        const { sessionId, menteeName, menteeEmail, mentorName, mentorEmail, title, scheduledAt, duration, price, paymentReference, upiId } = req.body || {};
        if (!menteeName || !menteeEmail || !mentorName || !mentorEmail || !title || !scheduledAt || !duration || !price) {
          return res.status(400).json({ error: "Missing required fields" });
        }

        const scheduledAtLabel = new Date(scheduledAt).toLocaleString();
        const priceInr = Number(price || 0);
        const durationMinutes = Number(duration || 0);

        const menteeEmailContent = generateMentorshipPaymentReceivedEmail({
          menteeName,
          mentorName,
          title,
          scheduledAtLabel,
          priceInr,
        });
        const mentorEmailContent = generateMentorshipNewRequestEmail({
          mentorName,
          mentorEmail,
          menteeName,
          title,
          scheduledAtLabel,
          durationMinutes,
          priceInr,
        });
        const adminEmailContent = generateMentorshipAdminEventEmail({
          event: "manual_payment_verified",
          mentorName,
          mentorEmail,
          menteeName,
          menteeEmail,
          title,
          scheduledAtLabel,
          priceInr,
          sessionId,
          upiId: upiId ? String(upiId) : undefined,
          paymentReference: paymentReference ? String(paymentReference) : undefined,
        });

        const results = await Promise.all([
          sendEmail({ to: menteeEmail, subject: menteeEmailContent.subject, html: menteeEmailContent.html }),
          sendEmail({ to: mentorEmail, subject: mentorEmailContent.subject, html: mentorEmailContent.html }),
          sendEmail({ to: getAdminEmail(), subject: adminEmailContent.subject, html: adminEmailContent.html }),
        ]);

        const sent = results.filter(Boolean).length;
        return res.json({ success: sent >= 2, sent, failed: results.length - sent });
      } catch (error) {
        console.error("Mentorship payment verified email error:", error);
        return res.status(500).json({ error: "Email service error" });
      }
    });

    app.post("/api/email/mentorship-confirmed", async (req: Request, res: Response) => {
      try {
        const { sessionId, menteeName, menteeEmail, mentorName, mentorEmail, title, scheduledAt, meetingUrl } = req.body || {};
        if (!menteeName || !menteeEmail || !mentorName || !title || !scheduledAt || !meetingUrl) {
          return res.status(400).json({ error: "Missing required fields" });
        }
        const scheduledAtLabel = new Date(scheduledAt).toLocaleString();
        const menteeEmailContent = generateMentorshipConfirmedEmail({
          menteeName,
          mentorName,
          title,
          scheduledAtLabel,
          meetingUrl,
        });
        const adminEmailContent = generateMentorshipAdminEventEmail({
          event: "confirmed",
          mentorName,
          mentorEmail,
          menteeName,
          menteeEmail,
          title,
          scheduledAtLabel,
          sessionId,
        });
        const results = await Promise.all([
          sendEmail({ to: menteeEmail, subject: menteeEmailContent.subject, html: menteeEmailContent.html }),
          sendEmail({ to: getAdminEmail(), subject: adminEmailContent.subject, html: adminEmailContent.html }),
        ]);
        const sent = results.filter(Boolean).length;
        return res.json({ success: sent === results.length, sent, failed: results.length - sent });
      } catch (error) {
        console.error("Mentorship confirmed email error:", error);
        return res.status(500).json({ error: "Email service error" });
      }
    });

    app.post("/api/email/mentorship-completed", async (req: Request, res: Response) => {
      try {
        const { sessionId, menteeName, menteeEmail, mentorName, mentorEmail, title } = req.body || {};
        if (!menteeName || !menteeEmail || !mentorName || !title) {
          return res.status(400).json({ error: "Missing required fields" });
        }
        const menteeEmailContent = generateMentorshipCompletedEmail({
          menteeName,
          mentorName,
          title,
        });
        const adminEmailContent = generateMentorshipAdminEventEmail({
          event: "completed",
          mentorName,
          mentorEmail,
          menteeName,
          menteeEmail,
          title,
          sessionId,
        });
        const results = await Promise.all([
          sendEmail({ to: menteeEmail, subject: menteeEmailContent.subject, html: menteeEmailContent.html }),
          sendEmail({ to: getAdminEmail(), subject: adminEmailContent.subject, html: adminEmailContent.html }),
        ]);
        const sent = results.filter(Boolean).length;
        return res.json({ success: sent === results.length, sent, failed: results.length - sent });
      } catch (error) {
        console.error("Mentorship completed email error:", error);
        return res.status(500).json({ error: "Email service error" });
      }
    });

    app.post("/api/email/mentorship-rating-received", async (req: Request, res: Response) => {
      try {
        const { sessionId, mentorName, mentorEmail, menteeName, menteeEmail, title, rating } = req.body || {};
        if (!mentorName || !mentorEmail || !title || !rating) {
          return res.status(400).json({ error: "Missing required fields" });
        }
        const ratingNumber = Number(rating || 0);
        const mentorEmailContent = generateMentorshipRatingReceivedEmail({
          mentorName,
          title,
          rating: ratingNumber,
        });
        const adminEmailContent = generateMentorshipAdminEventEmail({
          event: "rated",
          mentorName,
          mentorEmail,
          menteeName: menteeName || "Mentee",
          menteeEmail,
          title,
          rating: ratingNumber,
          sessionId,
        });
        const results = await Promise.all([
          sendEmail({ to: mentorEmail, subject: mentorEmailContent.subject, html: mentorEmailContent.html }),
          sendEmail({ to: getAdminEmail(), subject: adminEmailContent.subject, html: adminEmailContent.html }),
        ]);
        const sent = results.filter(Boolean).length;
        return res.json({ success: sent === results.length, sent, failed: results.length - sent });
      } catch (error) {
        console.error("Mentorship rating received email error:", error);
        return res.status(500).json({ error: "Email service error" });
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
    app.get('/api/razorpay/key-id', async (_req: Request, res: Response) => {
      const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
      if (!keyId) return res.status(500).json({ message: 'Razorpay key not configured' });
      return res.json({ keyId });
    });

    // Cashfree payment routes - Marketplace model (platform collects 100% in Phase 1)
    app.get("/api/cashfree/config", async (_req: Request, res: Response) => {
      const cfg = getCashfreeConfig();
      if (!cfg) return res.status(500).json({ message: "Cashfree not configured" });
      return res.json({ env: cfg.env });
    });

    app.post("/api/cashfree/create-order", async (req: Request, res: Response) => {
      try {
        const cfg = getCashfreeConfig();
        if (!cfg) return res.status(500).json({ message: "Cashfree not configured on server" });

        const { amount, currency = "INR", mentorId, customer } = req.body || {};
        const amt = Number(amount);
        if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ message: "Valid amount is required" });

        const orderId = `mentorship_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        const customerId = String(customer?.id || "guest").slice(0, 50);
        const customerName = String(customer?.name || "Customer").slice(0, 100);
        const customerEmail = String(customer?.email || "unknown@example.com").slice(0, 120);
        const customerPhone = String(customer?.phone || "9999999999").replace(/\D/g, "").slice(0, 15) || "9999999999";

        const baseUrl = cashfreeBaseUrl(cfg.env);
        const resp = await fetch(`${baseUrl}/pg/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-client-id": cfg.appId,
            "x-client-secret": cfg.secretKey,
            "x-api-version": "2022-09-01",
          },
          body: JSON.stringify({
            order_id: orderId,
            order_amount: amt,
            order_currency: currency,
            order_note: mentorId ? `Mentorship session for mentor ${mentorId}` : "Mentorship session",
            customer_details: {
              customer_id: customerId,
              customer_name: customerName,
              customer_email: customerEmail,
              customer_phone: customerPhone,
            },
            order_tags: {
              payment_type: "direct_platform_collects_all",
              mentor_id: mentorId || "unknown",
            },
          }),
        });

        const data: any = await resp.json().catch(() => null);
        if (!resp.ok) {
          console.error("Cashfree create-order error:", resp.status, data);
          return res.status(500).json({ message: data?.message || "Failed to create Cashfree order" });
        }

        return res.json({
          orderId: data?.order_id || orderId,
          paymentSessionId: data?.payment_session_id,
          status: data?.order_status,
          env: cfg.env,
        });
      } catch (error) {
        console.error("Cashfree order creation error:", error);
        return res.status(500).json({ message: "Failed to create Cashfree order" });
      }
    });

    app.post("/api/cashfree/verify-payment", async (req: Request, res: Response) => {
      try {
        const cfg = getCashfreeConfig();
        if (!cfg) return res.status(500).json({ message: "Cashfree not configured on server" });
        const { orderId } = req.body || {};
        if (!orderId) return res.status(400).json({ message: "orderId is required" });

        const baseUrl = cashfreeBaseUrl(cfg.env);
        const resp = await fetch(`${baseUrl}/pg/orders/${encodeURIComponent(String(orderId))}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-client-id": cfg.appId,
            "x-client-secret": cfg.secretKey,
            "x-api-version": "2022-09-01",
          },
        });
        const data: any = await resp.json().catch(() => null);
        if (!resp.ok) {
          console.error("Cashfree verify-payment error:", resp.status, data);
          return res.status(500).json({ message: data?.message || "Failed to verify Cashfree order" });
        }

        const status = String(data?.order_status || "").toUpperCase();
        const isPaid = status === "PAID";
        return res.json({
          verified: isPaid,
          status: data?.order_status,
          orderId: data?.order_id,
          orderAmount: data?.order_amount,
          paymentMethod: data?.payment_method,
        });
      } catch (error) {
        console.error("Cashfree verification error:", error);
        return res.status(500).json({ message: "Failed to verify Cashfree payment" });
      }
    });

    app.post('/api/razorpay/create-order', async (req: Request, res: Response) => {
      try {
        const { amount, currency = 'INR', receipt, mentorId } = req.body;
        
        if (!amount) {
          return res.status(400).json({ message: 'Amount is required' });
        }

        const razorpay = getRazorpayClient();
        if (!razorpay) {
          return res.status(500).json({ message: 'Razorpay not configured on server' });
        }

        const created = await razorpay.orders.create({
          amount: Math.round(Number(amount) * 100), // paise
          currency,
          receipt: receipt || `receipt_${Date.now()}`,
          notes: {
            mentor_id: mentorId || 'unknown',
            payment_type: 'direct_platform_collects_all',
          },
        });

        return res.json(created);
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

        const keySecret = process.env.RAZORPAY_KEY_SECRET || process.env.VITE_RAZORPAY_KEY_SECRET;
        if (!keySecret) {
          return res.status(500).json({ message: 'Razorpay secret not configured on server' });
        }

        const expectedSignature = crypto
          .createHmac('sha256', keySecret)
          .update(`${razorpay_order_id}|${razorpay_payment_id}`)
          .digest('hex');

        const isVerified = expectedSignature === razorpay_signature;

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

    // AI Mentor (text) - server-side Gemini
    // Simple in-memory cooldown to avoid hammering upstream when quota is exhausted.
    let aiCooldownUntil = 0;

    app.post("/api/ai/mentor", async (req: Request, res: Response) => {
      let intake: any = null;
      try {
        const body = req.body || {};
        intake = body.intake;
        const { mode, messages, profile } = body;
        if (mode === "lite-plan") {
          return res.json({ text: generateLitePlan(intake || {}) });
        }
        if (mode === "lite-chat") {
          const lastUser = Array.isArray(messages) ? messages.slice(-1)[0]?.content : "";
          return res.json({ text: generateLiteChat({ intake: intake || {}, lastUserMessage: lastUser }) });
        }

        const lastUser = Array.isArray(messages) ? messages.slice(-1)[0]?.content : "";
        const offlineForMode = () => {
          if (mode === "plan") return generateLitePlan(intake || {});
          if (mode === "resume-rewrite") return generateLiteResumeRewrite({ intake: intake || {}, resumeText: body.resumeText || "" });
          if (mode === "referral-dm")
            return generateLiteReferralDm({
              intake: intake || {},
              jobLink: body.jobLink || "",
              fitBullets: Array.isArray(body.fitBullets) ? body.fitBullets : [],
              channel: body.channel || "linkedin",
            });
          if (mode === "interview-pack") return generateLiteInterviewPack({ intake: intake || {}, roundType: body.roundType || "" });
          return generateLiteChat({ intake: intake || {}, lastUserMessage: lastUser });
        };

        // If we recently hit rate limit, skip upstream calls and return fallback immediately.
        if (Date.now() < aiCooldownUntil && !process.env.OPENAI_API_KEY) {
          const fallbackText = offlineForMode();
          return res.json({
            text: fallbackText,
            offline: true,
            message: "AI temporarily limited. Returned offline guidance.",
          });
        }
        const safeMessages: Array<{ role: "user" | "assistant"; content: string }> = Array.isArray(messages)
          ? (messages
              .map((m: any) => ({
                role: (m?.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
                content: String(m?.content || "").slice(0, 8000),
              }))
              .filter((m: { role: "user" | "assistant"; content: string }) => m.content.trim())
              .slice(-20) as Array<{ role: "user" | "assistant"; content: string }>)
          : [];

        const profileLine =
          profile && typeof profile === "object"
            ? `User profile: ${JSON.stringify(profile).slice(0, 1500)}`
            : "";

        const system = [
          "You are ReferralMe AI Mentor.",
          "You help Indian job seekers with practical next steps: resume strategy, interview prep, company targeting, networking/referrals etiquette, and weekly plans.",
          "Be concise, structured, and action-oriented. Use bullet points and short checklists. Avoid generic advice.",
          "If the user asks for referrals, guide them on ethical outreach and how to ask, not selling referrals.",
          "Do not claim you can contact companies or guarantee outcomes.",
          profileLine,
        ]
          .filter(Boolean)
          .join("\n");

        const intakeLine =
          intake && typeof intake === "object"
            ? `Intake (user provided): ${JSON.stringify(intake).slice(0, 3000)}`
            : "";

        const prompt =
          mode === "plan"
            ? [
                `SYSTEM:\n${system}\n\n`,
                intakeLine,
                "",
                "USER: Generate a premium, practical 7-day career plan.",
                "Constraints:",
                "- Output in clean plain text (no Markdown headings like #, no code fences).",
                "- Include sections: Goal, Current Snapshot, 7-Day Plan (Day 1..Day 7 with 3-6 tasks each), Resume/ATS fixes (top 8), Referral outreach plan (message templates + who to contact), Interview prep plan, Checkpoints (what to measure).",
                "- Keep it specific to the intake. Avoid generic filler.",
                "- End with: 'If you want human help, book a mentor session in the Mentorship tab.'",
                "",
                "ASSISTANT:",
              ].join("\n")
            : [
                `SYSTEM:\n${system}\n\n`,
                intakeLine,
                ...safeMessages.map((m) => `${m.role.toUpperCase()}: ${m.content}`),
                "\nASSISTANT:",
              ].join("\n");

        // 1) Prefer OpenAI if configured, else fall back to Gemini.
        const openaiText = await createOpenAIResponse({ instructions: system, input: prompt }).catch((e) => {
          throw e;
        });
        if (openaiText) return res.json({ text: openaiText });

        const genAI = getGeminiClient();
        if (!genAI) {
          return res.status(500).json({ message: "No AI provider configured. Set OPENAI_API_KEY or GEMINI_API_KEY." });
        }

        const response = await genAI.models.generateContent({
          model: GEMINI_MENTOR_MODEL,
          contents: prompt,
        });

        const text = response.text || "";
        return res.json({ text });
      } catch (error: any) {
        console.error("AI mentor error:", error);
        const msg = error instanceof Error ? error.message : String(error);
        if (String((error as any)?.status) === "429" || msg.includes("429") || msg.toLowerCase().includes("rate limit")) {
          aiCooldownUntil = Date.now() + 60_000; // 60s cooldown
          const body = (req as any)?.body || {};
          const lastUser = Array.isArray(body?.messages) ? body.messages.slice(-1)[0]?.content : "";
          const m = body?.mode;
          const fallbackText =
            m === "plan"
              ? generateLitePlan(intake || {})
              : m === "resume-rewrite"
                ? generateLiteResumeRewrite({ intake: intake || {}, resumeText: body.resumeText || "" })
                : m === "referral-dm"
                  ? generateLiteReferralDm({
                      intake: intake || {},
                      jobLink: body.jobLink || "",
                      fitBullets: Array.isArray(body.fitBullets) ? body.fitBullets : [],
                      channel: body.channel || "linkedin",
                    })
                  : m === "interview-pack"
                    ? generateLiteInterviewPack({ intake: intake || {}, roundType: body.roundType || "" })
                    : generateLiteChat({ intake: intake || {}, lastUserMessage: lastUser });
          return res.json({
            text: fallbackText,
            offline: true,
            message: "AI rate limited. Returned offline guidance.",
          });
        }
        if (msg.includes('"code":429') || msg.includes("429") || msg.toLowerCase().includes("quota")) {
          aiCooldownUntil = Date.now() + 5 * 60_000; // 5 min cooldown
          const body = (req as any)?.body || {};
          const lastUser = Array.isArray(body?.messages) ? body.messages.slice(-1)[0]?.content : "";
          const m = body?.mode;
          const fallbackText =
            m === "plan"
              ? generateLitePlan(intake || {})
              : m === "resume-rewrite"
                ? generateLiteResumeRewrite({ intake: intake || {}, resumeText: body.resumeText || "" })
                : m === "referral-dm"
                  ? generateLiteReferralDm({
                      intake: intake || {},
                      jobLink: body.jobLink || "",
                      fitBullets: Array.isArray(body.fitBullets) ? body.fitBullets : [],
                      channel: body.channel || "linkedin",
                    })
                  : m === "interview-pack"
                    ? generateLiteInterviewPack({ intake: intake || {}, roundType: body.roundType || "" })
                    : generateLiteChat({ intake: intake || {}, lastUserMessage: lastUser });
          return res.json({
            text: fallbackText,
            offline: true,
            message: "AI quota limited. Returned offline guidance.",
          });
        }
        return res.status(500).json({ message: "AI mentor request failed" });
      }
    });

    // Gemini proxy for client-side features (ATS/job extraction). Keeps API key on server only.
    app.post("/api/ai/gemini", async (req: Request, res: Response) => {
      try {
        const genAI = getGeminiClient();
        if (!genAI) {
          return res.status(500).json({ message: "GEMINI_API_KEY not configured on server" });
        }

        const prompt = String(req.body?.prompt || "").slice(0, 24000);
        const options = req.body?.options || {};

        const allowFallbackModels = Boolean(options.allowFallbackModels);
        const responseMimeType = options.responseMimeType ? String(options.responseMimeType) : undefined;
        const responseSchema = options.responseSchema && typeof options.responseSchema === "object" ? options.responseSchema : undefined;

        const modelCandidates = [
          options.model ? String(options.model) : null,
          process.env.GEMINI_MODEL || null,
          "gemini-2.0-flash",
          "gemini-1.5-flash-latest",
          "gemini-1.5-flash-8b",
        ]
          .filter(Boolean)
          // if allowFallbackModels is false, keep just the first candidate
          .filter((_, idx, arr) => (allowFallbackModels ? true : idx === 0 || (idx === 1 && !arr[0])));

        let lastErr: any = null;
        for (const model of modelCandidates) {
          try {
            const response = await genAI.models.generateContent({
              model: String(model),
              contents: prompt,
              config: {
                responseMimeType,
                responseSchema,
              },
            });
            return res.json({ text: response.text || "" });
          } catch (e: any) {
            lastErr = e;
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes('"code":403') || msg.includes('"code":404')) break;
          }
        }

        const msg = lastErr instanceof Error ? lastErr.message : "Gemini request failed";
        if (msg.includes('"code":429') || msg.includes("429") || msg.toLowerCase().includes("quota")) {
          return res.status(429).json({ message: "Gemini rate limit/quota exceeded. Try later." });
        }
        return res.status(500).json({ message: "Gemini request failed" });
      } catch (error) {
        console.error("Gemini proxy error:", error);
        return res.status(500).json({ message: "Gemini proxy failed" });
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

    app.post('/api/email/campus-ambassador-status', async (req: Request, res: Response) => {
      try {
        const { name, email, status, dashboardUrl } = req.body;

        if (!name || !email || !status) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        let emailContent;
        if (status === 'shortlisted') {
          emailContent = generateCampusAmbassadorShortlistedEmail(name);
        } else if (status === 'accepted') {
          emailContent = generateCampusAmbassadorAcceptedEmail(name, dashboardUrl);
        } else {
          return res.status(400).json({ error: 'Invalid status. Must be shortlisted or accepted' });
        }

        const emailSent = await sendEmail({
          to: email,
          subject: emailContent.subject,
          html: emailContent.html
        });

        if (emailSent) {
          res.json({ success: true });
        } else {
          res.status(500).json({ error: 'Failed to send email' });
        }
      } catch (error) {
        console.error('Campus ambassador status email error:', error);
        res.status(500).json({ error: 'Email service error' });
      }
    });

    app.post('/api/admin/broadcast-email', async (req: Request, res: Response) => {
      try {
        const { recipients, subject, title, message, ctaLabel, ctaHref } = req.body;

        if (!Array.isArray(recipients) || recipients.length === 0 || !subject || !title || !message) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        let sent = 0;
        let failed = 0;

        for (const recipient of recipients) {
          if (!recipient?.email) {
            failed += 1;
            continue;
          }

          const emailContent = generatePlatformAnnouncementEmail(
            recipient.name || recipient.email,
            title,
            message,
            ctaLabel,
            ctaHref,
          );

          const emailSent = await sendEmail({
            to: recipient.email,
            subject: subject || emailContent.subject,
            html: emailContent.html,
          });

          if (emailSent) sent += 1;
          else failed += 1;
        }

        res.json({ success: failed === 0, sent, failed });
      } catch (error) {
        console.error('Admin broadcast email error:', error);
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
