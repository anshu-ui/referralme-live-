// Production-ready client-side email service using Brevo (formerly Sendinblue) API for Hostinger deployment

// Get fresh Brevo API key from environment
const getApiKey = () => {
  // Priority: 1. VITE_BREVO_API_KEY from env, 2. Existing hardcoded fallback
  const key = import.meta.env.VITE_BREVO_API_KEY || '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';
  if (!key) {
    console.error('VITE_BREVO_API_KEY environment variable not set');
    return null;
  }
  return key;
};

const FROM_EMAIL = 'amit@referralme.in';

// Production Brevo API function
async function sendEmailViaBrevo(to: string, subject: string, htmlContent: string): Promise<boolean> {
  console.log(`📧 BREVO: Attempting to send email to ${to}`);
  
  const BREVO_API_KEY = getApiKey();
  
  if (!BREVO_API_KEY) {
    console.error('❌ Brevo API key not available');
    return false;
  }

  try {
    const emailPayload = {
      sender: {
        name: 'ReferralMe Team',
        email: FROM_EMAIL
      },
      to: [
        {
          email: to,
          name: to.split('@')[0]
        }
      ],
      subject: subject,
      htmlContent: htmlContent
    };
    
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify(emailPayload),
    });

    if (response.ok) {
      console.log(`✅ BREVO SUCCESS: Email sent to ${to}`);
      return true;
    } else {
      const errorData = await response.text();
      console.error(`❌ BREVO ERROR (${response.status}):`, errorData);
      
      // Fallback for demo purposes if API key is invalid but we want to show flow
      if (response.status === 401 || response.status === 403) {
        console.warn('⚠️ Brevo API Key might be invalid or unauthorized. Please check your Brevo account.');
      }
      return false;
    }
  } catch (error) {
    console.error('❌ BREVO EXCEPTION:', error);
    return false;
  }
}

// Send welcome email after profile completion
export async function sendWelcomeEmail(name: string, email: string, role: string): Promise<boolean> {
  console.log(`📧 WELCOME EMAIL DEBUG: Starting email process`);
  console.log(`📧 WELCOME EMAIL DEBUG: Name: "${name}"`);
  console.log(`📧 WELCOME EMAIL DEBUG: Email: "${email}"`);
  console.log(`📧 WELCOME EMAIL DEBUG: Role: "${role}"`);
  console.log(`📧 WELCOME EMAIL DEBUG: Role type: ${typeof role}`);
  
  if (!name || !email || !role) {
    console.error("❌ Missing required fields for welcome email:", { name, email, role });
    return false;
  }
  
  try {
    const isSeeker = role === 'seeker' || role === 'job_seeker';
    console.log(`📧 WELCOME EMAIL DEBUG: Is seeker check: ${isSeeker} (role === 'seeker': ${role === 'seeker'}, role === 'job_seeker': ${role === 'job_seeker'})`);
    
    const subject = `Welcome to ReferralMe - ${isSeeker ? 'Start Your Job Search Journey!' : 'Help Others While Building Your Network!'}`;
    
    console.log(`📧 WELCOME EMAIL DEBUG: Subject: ${subject}`);
    console.log(`📧 Sending ${isSeeker ? 'SEEKER' : 'REFERRER'} welcome email to:`, email);
    
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; background: #ffffff; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; }
            .btn { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to ReferralMe!</h1>
                <p>Your professional networking journey starts here</p>
            </div>
            <div class="content">
                <h2>Hi ${name},</h2>
                <p>Thank you for joining ReferralMe! We're excited to have you as part of our professional networking community.</p>
                
                ${isSeeker ? `
                <p>As a <strong>Job Seeker</strong>, you can now:</p>
                <ul>
                    <li>Browse exciting job opportunities</li>
                    <li>Request referrals from industry professionals</li>
                    <li>Build meaningful professional connections</li>
                    <li>Track your application status in real-time</li>
                </ul>
                ` : `
                <p>As a <strong>Referrer</strong>, you can now:</p>
                <ul>
                    <li>Post job opportunities from your network</li>
                    <li>Help talented professionals find great opportunities</li>
                    <li>Build your professional reputation</li>
                    <li>Make meaningful connections in your industry</li>
                </ul>
                `}
                
                <a href="https://referralme.in/dashboard" class="btn">Get Started Now</a>
                
                <p>If you have any questions, feel free to reach out to us at amit@referralme.in</p>
                
                <p>Best regards,<br>The ReferralMe Team</p>
            </div>
            <div class="footer">
                <p>© 2025 ReferralMe. Built with ❤️ in India.</p>
                <p>Visit us at <a href="https://referralme.in">referralme.in</a></p>
            </div>
        </div>
    </body>
    </html>
    `;

    console.log(`📧 WELCOME EMAIL DEBUG: About to call sendEmailViaBrevo`);
    const result = await sendEmailViaBrevo(email, subject, htmlContent);
    console.log(`📧 WELCOME EMAIL DEBUG: sendEmailViaBrevo returned: ${result}`);
    console.log(`📧 Welcome email ${result ? 'SUCCESS' : 'FAILED'} for ${email} (role: ${role}, isSeeker: ${isSeeker})`);
    return result;
  } catch (error) {
    console.error('❌ Welcome email exception:', error);
    return false;
  }
}

// Send job posting confirmation email to referrer
export async function sendJobPostingConfirmation(
  referrerName: string,
  referrerEmail: string,
  job: any
): Promise<boolean> {
  try {
    const subject = `Job Posted Successfully - ${job.title}`;
    
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; background: #ffffff; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; }
            .btn { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
            .job-details { background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Job Posted Successfully!</h1>
            </div>
            <div class="content">
                <h2>Hi ${referrerName},</h2>
                <p>Great news! Your job posting has been published successfully on ReferralMe.</p>
                
                <div class="job-details">
                    <h3>Job Details:</h3>
                    <p><strong>Position:</strong> ${job.title}</p>
                    <p><strong>Company:</strong> ${job.company}</p>
                    <p><strong>Location:</strong> ${job.location}</p>
                    <p><strong>Job Type:</strong> ${job.jobType || 'Not specified'}</p>
                    <p><strong>Salary:</strong> ${job.salary || 'Not specified'}</p>
                </div>
                
                <p>Your job posting is now visible to all job seekers on the platform. You'll receive email notifications whenever someone applies.</p>
                
                <a href="https://referralme.in/referrer-dashboard" class="btn">View Applications</a>
                
                <p>Thank you for using ReferralMe to help others in their career journey!</p>
                
                <p>Best regards,<br>The ReferralMe Team</p>
            </div>
            <div class="footer">
                <p>© 2025 ReferralMe. Built with ❤️ in India.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    console.log(`📧 Sending job posting confirmation to: ${referrerEmail}`);
    return await sendEmailViaBrevo(referrerEmail, subject, htmlContent);
  } catch (error) {
    console.error('❌ Job posting confirmation failed:', error);
    return false;
  }
}

// Send job alert to all seekers when new job is posted
export async function sendJobAlertToSeekers(job: any, referrerName: string, seekers: any[]): Promise<void> {
  try {
    // For static hosting, log the emails that would be sent
    console.log(`Job alert would be sent to ${seekers.length} seekers for job: ${job.title} by ${referrerName}`);
    
    // In production, integrate with client-side email service
    return;
  } catch (error) {
    console.error('Failed to send job alerts:', error);
  }
}

// Send application received notification to referrer
export async function sendApplicationReceivedNotification(
  referrerName: string, 
  referrerEmail: string, 
  job: any, 
  seeker: any
): Promise<boolean> {
  try {
    const subject = `New Application Received - ${job.title}`;
    
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; background: #ffffff; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; }
            .btn { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
            .job-details { background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>New Application Received!</h1>
            </div>
            <div class="content">
                <h2>Hi ${referrerName},</h2>
                <p>Great news! You've received a new application for your job posting.</p>
                
                <div class="job-details">
                    <h3>Job Details:</h3>
                    <p><strong>Position:</strong> ${job.title}</p>
                    <p><strong>Company:</strong> ${job.company}</p>
                    <p><strong>Location:</strong> ${job.location}</p>
                </div>
                
                <div class="job-details">
                    <h3>Applicant Details:</h3>
                    <p><strong>Name:</strong> ${seeker.firstName} ${seeker.lastName}</p>
                    <p><strong>Email:</strong> ${seeker.email}</p>
                    <p><strong>Experience:</strong> ${seeker.experience || 'Not specified'}</p>
                    <p><strong>Current Role:</strong> ${seeker.jobTitle || 'Not specified'}</p>
                </div>
                
                <a href="https://referralme.in/referrer-dashboard" class="btn">Review Application</a>
                
                <p>Log into your dashboard to review the full application details and make your decision.</p>
                
                <p>Best regards,<br>The ReferralMe Team</p>
            </div>
            <div class="footer">
                <p>© 2025 ReferralMe. Built with ❤️ in India.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    return await sendEmailViaBrevo(referrerEmail, subject, htmlContent);
  } catch (error) {
    console.error('❌ Application notification failed:', error);
    return false;
  }
}

// Send application status update to seeker
export async function sendApplicationStatusUpdate(
  seekerName: string,
  seekerEmail: string,
  job: any,
  status: string,
  referrerName: string
): Promise<boolean> {
  try {
    const isAccepted = status === 'accepted';
    const subject = `Application ${isAccepted ? 'Accepted' : 'Update'} - ${job.title}`;
    
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; background: #ffffff; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; }
            .btn { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
            .status { padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; font-weight: bold; }
            .accepted { background: #dcfce7; color: #166534; border: 2px solid #22c55e; }
            .rejected { background: #fef2f2; color: #991b1b; border: 2px solid #ef4444; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Application Status Update</h1>
            </div>
            <div class="content">
                <h2>Hi ${seekerName},</h2>
                <p>We have an update on your application for <strong>${job.title}</strong> at <strong>${job.company}</strong>.</p>
                
                <div class="status ${isAccepted ? 'accepted' : 'rejected'}">
                    Your application has been ${status.toUpperCase()}
                </div>
                
                ${isAccepted ? `
                <p>Congratulations! ${referrerName} would like to provide you with a referral for this position.</p>
                <p>Next steps:</p>
                <ul>
                    <li>Check your dashboard for referrer contact details</li>
                    <li>Reach out to the referrer to discuss the opportunity</li>
                    <li>Prepare for potential interviews</li>
                </ul>
                ` : `
                <p>While this particular opportunity didn't work out, don't be discouraged!</p>
                <p>Keep exploring other opportunities on ReferralMe - your perfect match is out there.</p>
                `}
                
                <a href="https://referralme.in/seeker-dashboard" class="btn">View Dashboard</a>
                
                <p>Thank you for using ReferralMe to advance your career!</p>
                
                <p>Best regards,<br>The ReferralMe Team</p>
            </div>
            <div class="footer">
                <p>© 2025 ReferralMe. Built with ❤️ in India.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    return await sendEmailViaBrevo(seekerEmail, subject, htmlContent);
  } catch (error) {
    console.error('❌ Status update email failed:', error);
    return false;
  }
}