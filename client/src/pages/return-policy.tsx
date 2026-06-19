import { Card, CardContent } from "../components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function ReturnPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to ReferralMe
          </Link>
          <div className="text-center bg-white rounded-2xl shadow-lg p-8 border border-blue-100">
            <div className="flex items-center justify-center mb-6">
              <img src={"/logo.png"} alt="ReferralMe" className="h-12 w-12 mr-3 rounded-lg" />
              <span className="text-3xl font-bold text-blue-600">ReferralMe</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Return Policy</h1>
            <div className="inline-flex items-center bg-blue-50 border border-blue-200 rounded-lg px-6 py-3">
              <p className="text-blue-800 font-medium">Last updated: June 19, 2026</p>
            </div>
          </div>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-10 space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">No Returns</h2>
              <p className="text-gray-700">
                ReferralMe provides digital services (subscriptions, mentorship bookings, and platform features). We do
                not ship physical products. Therefore, <strong>our business does not support returns</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Refunds</h2>
              <p className="text-gray-700">
                If you are looking for refund information, please refer to our{" "}
                <Link href="/refund-policy" className="text-blue-600 hover:underline">
                  Refund Policy
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Contact</h2>
              <p className="text-gray-700">
                For questions, contact{" "}
                <a className="text-blue-600 hover:underline" href="mailto:info@referralme.in">
                  info@referralme.in
                </a>
                .
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
