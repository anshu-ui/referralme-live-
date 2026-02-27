#!/usr/bin/env node

/**
 * Build script for Hostinger deployment
 * Creates a static production build optimized for shared hosting
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building ReferralMe for Hostinger deployment...');

try {
  // Build the React app
  console.log('📦 Building React application...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Copy .htaccess to dist folder
  console.log('📋 Copying .htaccess configuration...');
  const htaccessSource = path.join(__dirname, '.htaccess');
  const htaccessDest = path.join(__dirname, 'dist', '.htaccess');
  
  if (fs.existsSync(htaccessSource)) {
    fs.copyFileSync(htaccessSource, htaccessDest);
    console.log('✅ .htaccess copied to dist folder');
  } else {
    console.warn('⚠️  .htaccess file not found');
  }
  
  // Create deployment instructions
  const instructions = `
🎉 Build completed successfully!

📁 Upload the entire 'dist' folder contents to your Hostinger public_html directory:
   
   Hostinger File Manager:
   1. Login to Hostinger control panel
   2. Go to File Manager
   3. Navigate to public_html/
   4. Upload all files from the 'dist' folder
   5. Make sure .htaccess file is included
   
   Required Firebase Configuration:
   - Make sure your Firebase project allows your domain
   - Add your production domain to Firebase Authentication settings
   - Verify Firestore security rules allow your domain
   
🔧 Post-deployment checklist:
   ✓ Verify .htaccess file is present and readable
   ✓ Test Firebase authentication on your domain
   ✓ Check browser console for any remaining CSP violations
   ✓ Test file uploads (profile pictures, resumes)
   
🌐 Your app will be available at: https://yourdomain.com
`;
  
  fs.writeFileSync(path.join(__dirname, 'DEPLOYMENT_INSTRUCTIONS.txt'), instructions);
  console.log('📝 Deployment instructions created');
  
  console.log('✅ Build process completed!');
  console.log('📂 Files ready for upload in the "dist" folder');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}