import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";


export default function PrivacyPolicy() {
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
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
            <div className="inline-flex items-center bg-blue-50 border border-blue-200 rounded-lg px-6 py-3">
              <p className="text-blue-800 font-medium">Last updated: January 12, 2025</p>
            </div>
          </div>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-10 space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Personal Information</h3>
                  <p className="text-gray-700">
                    When you create an account, we collect information such as your name, email address, 
                    phone number, professional details, and any information you provide in your profile.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Usage Information</h3>
                  <p className="text-gray-700">
                    We collect information about how you use our service, including job applications, 
                    referral requests, and interactions with other users.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Payment Information</h3>
                  <p className="text-gray-700">
                    Payment processing is handled by Razorpay. We do not store your complete payment card 
                    information on our servers.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>To provide and maintain our referral platform services</li>
                <li>To facilitate connections between job seekers and referrers</li>
                <li>To process payments for premium features</li>
                <li>To communicate with you about your account and our services</li>
                <li>To improve our platform and develop new features</li>
                <li>To comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Information Sharing</h2>
              <p className="text-gray-700 mb-4">
                We do not sell, trade, or rent your personal information to third parties. We may share 
                your information in the following circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>With your consent, when connecting you with referrers or job seekers</li>
                <li>With service providers who assist us in operating our platform</li>
                <li>When required by law or to protect our rights and safety</li>
                <li>In connection with a business transfer or merger</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
              <p className="text-gray-700">
                We implement appropriate security measures to protect your personal information against 
                unauthorized access, alteration, disclosure, or destruction. However, no method of 
                transmission over the internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Access and update your personal information</li>
                <li>Request deletion of your account and associated data</li>
                <li>Opt-out of marketing communications</li>
                <li>Request a copy of your data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Cookies and Tracking</h2>
              <p className="text-gray-700">
                We use cookies and similar technologies to enhance your experience, analyze usage patterns, 
                and provide personalized content. You can control cookie preferences through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Changes to This Policy</h2>
              <p className="text-gray-700">
                We may update this privacy policy from time to time. We will notify you of any material 
                changes by posting the new policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Data Retention</h2>
              <p className="text-gray-700 mb-4">
                We retain your personal information for as long as necessary to provide our services and comply with legal obligations:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Account information: Retained while your account is active and up to 2 years after closure</li>
                <li>Payment records: Retained for 7 years as required by Indian tax laws</li>
                <li>Communication records: Retained for 3 years for support and legal purposes</li>
                <li>Analytics data: Anonymized and retained for business analysis</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Third-Party Services</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Payment Processing</h3>
                  <p className="text-gray-700">
                    We use Razorpay for payment processing. Razorpay's privacy policy governs 
                    the collection and use of payment information. We recommend reviewing their 
                    privacy policy at <a href="https://razorpay.com/privacy/" className="text-blue-600 hover:underline">razorpay.com/privacy</a>.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Firebase Authentication</h3>
                  <p className="text-gray-700">
                    We use Google Firebase for user authentication. Google's privacy policy 
                    applies to this service. Review at <a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline">policies.google.com/privacy</a>.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Video Calling</h3>
                  <p className="text-gray-700">
                    For mentorship sessions, we use Daily.co for video calling services. 
                    Their privacy policy governs video session data.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Indian Privacy Laws Compliance</h2>
              <p className="text-gray-700 mb-4">
                This privacy policy complies with applicable Indian laws including the Information Technology Act, 2000 
                and the Personal Data Protection Bill. We are committed to protecting your privacy rights under Indian law.
              </p>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Your Rights Under Indian Law</h3>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>Right to access your personal data</li>
                  <li>Right to correct inaccurate data</li>
                  <li>Right to withdraw consent</li>
                  <li>Right to data portability</li>
                  <li>Right to erasure (right to be forgotten)</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Age Restrictions</h2>
              <p className="text-gray-700">
                Our service is intended for users who are at least 18 years old. We do not knowingly 
                collect personal information from children under 18. If you are under 18, please do not 
                use our service or provide any personal information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">International Data Transfers</h2>
              <p className="text-gray-700">
                Your data is primarily stored and processed in India. In some cases, data may be transferred 
                to other countries for processing by our service providers. We ensure appropriate safeguards 
                are in place for such transfers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Grievance Officer</h2>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium mb-2">As required under Indian IT laws, our Grievance Officer is:</p>
                <p className="text-gray-700">Name: Privacy Officer</p>
                <p className="text-gray-700">Email: amit@referralme.in</p>
                <p className="text-gray-700">Response Time: Within 24 hours</p>
                <p className="text-gray-700 text-sm mt-2">
                  For complaints related to data processing, please contact our Grievance Officer 
                  who will address your concerns promptly.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
              <p className="text-gray-700">
                If you have any questions about this privacy policy, please contact us at:
              </p>
              <div className="mt-4 p-6 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="font-semibold text-blue-900 mb-3">ReferralMe Support Team</p>
                <div className="space-y-2">
                  <p className="text-blue-800 flex items-center">
                    <span className="w-16 font-medium">Email:</span>
                    <a href="mailto:amit@referralme.in" className="text-blue-600 hover:text-blue-800 underline">amit@referralme.in</a>
                  </p>
                  <p className="text-blue-700 text-sm">
                    Business Hours: Monday to Friday, 9:00 AM to 6:00 PM IST
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