import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";


export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <div className="text-center bg-white rounded-2xl shadow-lg p-8 border border-blue-100">
            <div className="flex items-center justify-center mb-6">
              <img src={"/logo.png"} alt="ReferralMe" className="h-12 w-12 mr-3 rounded-lg" />
              <span className="text-3xl font-bold text-blue-600">ReferralMe</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
            <div className="inline-flex items-center bg-blue-50 border border-blue-200 rounded-lg px-6 py-3">
              <p className="text-blue-800 font-medium">Last updated: January 12, 2025</p>
            </div>
          </div>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-10 space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Acceptance of Terms</h2>
              <p className="text-gray-700">
                By accessing and using ReferralMe, you accept and agree to be bound by the terms and 
                provisions of this agreement. If you do not agree to abide by the above, please do not 
                use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Service Description</h2>
              <p className="text-gray-700 mb-4">
                ReferralMe is a professional networking platform that connects job seekers with industry 
                professionals through a referral system. Our services include:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Job posting and discovery platform</li>
                <li>Referral request and management system</li>
                <li>Professional networking and mentorship services</li>
                <li>Premium features for enhanced user experience</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">User Accounts</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Account Registration</h3>
                  <p className="text-gray-700">
                    You must provide accurate and complete information when creating an account. 
                    You are responsible for maintaining the confidentiality of your account credentials.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Account Types</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                    <li><strong>Job Seekers:</strong> Free registration with limited referral requests (3 per month)</li>
                    <li><strong>Referrers:</strong> Free registration with unlimited job posting capabilities</li>
                    <li><strong>Premium Users:</strong> Paid subscription with unlimited features</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Payment Terms & No Refund Policy</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Payment Processing</h3>
                  <p className="text-gray-700">
                    All payments are processed through Razorpay, a secure payment gateway. By making a 
                    payment, you agree to Razorpay's terms and conditions.
                  </p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-2 text-yellow-800">⚠️ No Refund Policy</h3>
                  <p className="text-yellow-700">
                    <strong>All payments made to ReferralMe are final and non-refundable.</strong> This includes:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-yellow-700 mt-2 ml-4">
                    <li>Premium subscription fees</li>
                    <li>Mentorship session payments</li>
                    <li>Additional referral request packages</li>
                    <li>Any other paid services or features</li>
                  </ul>
                  <p className="text-yellow-700 mt-3">
                    Please ensure you understand the service features before making any payment. 
                    We encourage users to utilize free features first to evaluate our platform.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Subscription Terms</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                    <li>Subscriptions are billed monthly or annually as selected</li>
                    <li>Auto-renewal can be disabled in account settings</li>
                    <li>Service access continues until the end of the billing period</li>
                    <li>No partial refunds for unused portions of subscription periods</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">User Conduct</h2>
              <p className="text-gray-700 mb-4">You agree not to:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Use the service for any unlawful purpose or activity</li>
                <li>Share false, misleading, or fraudulent information</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Attempt to gain unauthorized access to other accounts</li>
                <li>Spam or send unsolicited communications</li>
                <li>Violate intellectual property rights</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Service Limitations</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Free Tier Limitations</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                    <li>Job seekers: 3 referral requests per month</li>
                    <li>Limited access to analytics and insights</li>
                    <li>Standard customer support</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Service Availability</h3>
                  <p className="text-gray-700">
                    While we strive for 99.9% uptime, we do not guarantee uninterrupted service. 
                    Scheduled maintenance and unforeseen technical issues may cause temporary disruptions.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Intellectual Property</h2>
              <p className="text-gray-700">
                All content, features, and functionality of ReferralMe are owned by us and are protected 
                by copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Disclaimers</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>ReferralMe does not guarantee job placement or interview success</li>
                <li>We are not responsible for the accuracy of user-provided information</li>
                <li>Referral outcomes depend on multiple factors beyond our control</li>
                <li>We do not endorse or verify the credentials of users</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Termination</h2>
              <p className="text-gray-700">
                We reserve the right to terminate or suspend accounts that violate these terms. 
                Users may also delete their accounts at any time through account settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Changes to Terms</h2>
              <p className="text-gray-700">
                We reserve the right to modify these terms at any time. Users will be notified of 
                significant changes via email or platform notifications.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Liability and Indemnification</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Limitation of Liability</h3>
                  <p className="text-gray-700">
                    ReferralMe shall not be liable for any indirect, incidental, special, consequential, 
                    or punitive damages arising from your use of the service. Our total liability is 
                    limited to the amount paid by you in the 12 months preceding the claim.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">User Indemnification</h3>
                  <p className="text-gray-700">
                    You agree to indemnify and hold ReferralMe harmless from any claims, damages, 
                    or expenses arising from your use of the service or violation of these terms.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Governing Law and Disputes</h2>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Indian Jurisdiction</h3>
                <p className="text-blue-800 mb-2">
                  These terms are governed by the laws of India. Any disputes will be resolved 
                  in the courts of Bangalore, Karnataka, India.
                </p>
                <div className="space-y-2 text-blue-700">
                  <p><strong>Dispute Resolution Process:</strong></p>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Contact our support team first: support@referralme.in</li>
                    <li>Escalate to our legal team: legal@referralme.in</li>
                    <li>Mediation through approved mediators in Bangalore</li>
                    <li>Arbitration as per Indian Arbitration and Conciliation Act</li>
                    <li>Court proceedings only as a last resort</li>
                  </ol>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Data Protection and Privacy</h2>
              <p className="text-gray-700 mb-4">
                Your use of ReferralMe is also governed by our Privacy Policy. By using our service, 
                you consent to the collection and use of your information as outlined in our 
                <Link href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-900 mb-2">🔒 Your Data Rights</h3>
                <ul className="list-disc list-inside space-y-1 text-green-800">
                  <li>Right to access your personal data</li>
                  <li>Right to correct or update information</li>
                  <li>Right to delete your account and data</li>
                  <li>Right to data portability</li>
                  <li>Right to withdraw consent</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Force Majeure</h2>
              <p className="text-gray-700">
                ReferralMe shall not be liable for any delays or failures in performance resulting 
                from acts beyond our reasonable control, including but not limited to natural disasters, 
                war, terrorism, strikes, internet outages, or government actions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Severability</h2>
              <p className="text-gray-700">
                If any provision of these terms is found to be unenforceable or invalid, the remaining 
                provisions will remain in full force and effect. The invalid provision will be replaced 
                with a valid provision that most closely matches the intent of the original.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
              <p className="text-gray-700">
                For questions about these terms, please contact us:
              </p>
              <div className="mt-4 p-6 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="font-semibold text-blue-900 mb-3">ReferralMe Legal & Support Team</p>
                <div className="space-y-2">
                  <p className="text-blue-800 flex items-center">
                    <span className="w-16 font-medium">Email:</span>
                    <a href="mailto:amit@referralme.in" className="text-blue-600 hover:text-blue-800 underline">amit@referralme.in</a>
                  </p>
                  <p className="text-blue-700 text-sm">
                    Business Hours: Monday to Friday, 9:00 AM to 6:00 PM IST
                  </p>
                  <p className="text-blue-700 text-xs mt-3 italic">
                    We aim to respond to all legal inquiries within 24 hours during business days.
                  </p>
                </div>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}