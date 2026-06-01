import { Card, CardContent } from "../components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to ReferralMe
          </Link>
          <div className="text-center bg-white rounded-2xl shadow-lg p-8 border border-blue-100">
            <div className="flex items-center justify-center mb-6">
              <img src={"/logo.png"} alt="ReferralMe" className="h-12 w-12 mr-3 rounded-lg" />
              <span className="text-3xl font-bold text-blue-600">ReferralMe</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact</h1>
            <div className="inline-flex items-center bg-blue-50 border border-blue-200 rounded-lg px-6 py-3">
              <p className="text-blue-800 font-medium">Support, billing, and policy questions</p>
            </div>
          </div>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-10 space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Support</h2>
              <p className="text-gray-700 mb-3">
                For help with your account, payments, or mentorship bookings, email us and we will respond as soon as possible.
              </p>
              <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                <p className="text-blue-900 font-semibold">Email</p>
                <a href="mailto:info@referralme.in" className="text-blue-700 hover:underline">
                  info@referralme.in
                </a>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Business Details</h2>
              <div className="p-6 bg-gray-50 rounded-xl space-y-2 text-gray-700">
                <p>
                  <span className="font-semibold">Legal name:</span> Amit Kumar (Proprietor)
                </p>
                <p>
                  <span className="font-semibold">Website:</span> referralme.in
                </p>
                <p>
                  <span className="font-semibold">Address:</span> Village Parnali, Post Office Uhal, Tehsil Tauni Devi,
                  Hamirpur, Himachal Pradesh 177022, India
                </p>
              </div>
              <p className="text-gray-600 text-sm mt-3">
                Note: If you operate as a registered company (Pvt Ltd/LLP), replace the legal name above with the company
                name and registered office address.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">No Job Guarantee</h2>
              <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-900">
                <p className="font-semibold mb-2">Important</p>
                <p className="text-yellow-800">
                  ReferralMe provides career mentorship and guidance. We do not guarantee interviews, referrals, job
                  offers, or placement outcomes. Any referral support, if available, depends on mentor discretion and
                  company policies.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Policies</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>
                  <Link href="/terms-of-service" className="text-blue-600 hover:underline">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy-policy" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/refund-policy" className="text-blue-600 hover:underline">
                    Refund & Cancellation Policy
                  </Link>
                </li>
                <li>
                  <Link href="/return-policy" className="text-blue-600 hover:underline">
                    Return Policy
                  </Link>
                </li>
              </ul>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
