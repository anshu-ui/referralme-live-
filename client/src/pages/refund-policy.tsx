import { Card, CardContent } from "../components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function RefundPolicy() {
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
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Refund & Cancellation Policy</h1>
            <div className="inline-flex items-center bg-blue-50 border border-blue-200 rounded-lg px-6 py-3">
              <p className="text-blue-800 font-medium">Last updated: May 20, 2026</p>
            </div>
          </div>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-10 space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Overview</h2>
              <p className="text-gray-700">
                ReferralMe offers digital services (such as platform subscriptions, mentorship bookings, and related
                features). Refunds are limited and are granted only in the cases described below.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Refund Eligibility</h2>
              <div className="space-y-4 text-gray-700">
                <div>
                  <h3 className="text-lg font-medium mb-2">1) Duplicate or Incorrect Charges</h3>
                  <p>
                    If you are charged more than once for the same transaction, or the amount is incorrect due to a
                    processing error, you are eligible for a refund of the extra amount.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">2) Payment Success but Service Not Delivered</h3>
                  <p>
                    If payment is successful but the purchased service is not delivered due to a technical issue on our
                    side, you are eligible for a refund or a replacement (at our discretion).
                  </p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-2 text-yellow-800">Mentorship Sessions</h3>
                  <ul className="list-disc list-inside space-y-2 text-yellow-700">
                    <li>
                      You can request a reschedule with the mentor if the original time does not work.
                    </li>
                    <li>
                      If a mentor cancels and a reschedule is not accepted by you within a reasonable time, you may
                      request a refund for that session.
                    </li>
                    <li>
                      If a session is completed (or marked completed), it is not eligible for refund.
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Cancellations</h2>
              <div className="space-y-4 text-gray-700">
                <div>
                  <h3 className="text-lg font-medium mb-2">Mentorship Booking Cancellation</h3>
                  <ul className="list-disc list-inside space-y-2">
                    <li>
                      If you cancel before the session starts, we may issue a refund or provide a reschedule option,
                      depending on the mentor’s availability and the booking status.
                    </li>
                    <li>
                      If the session has started or is completed, it is generally not eligible for cancellation/refund.
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Subscription Cancellation</h3>
                  <ul className="list-disc list-inside space-y-2">
                    <li>Subscriptions can be cancelled any time to stop future renewals.</li>
                    <li>Fees already paid for a current billing period are typically not refunded unless required by law.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Non-Refundable Cases</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Change of mind after purchase.</li>
                <li>Unused time or partial usage of a subscription period.</li>
                <li>Services already delivered (including completed mentorship sessions).</li>
                <li>Third-party delays or issues outside ReferralMe’s control.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">How to Request a Refund</h2>
              <p className="text-gray-700">
                Email us at{" "}
                <a className="text-blue-600 hover:underline" href="mailto:info@referralme.in">
                  info@referralme.in
                </a>{" "}
                with your registered email, transaction details, and the reason for the request. We may ask for
                additional information to verify the request.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Processing Time</h2>
              <p className="text-gray-700">
                Approved refunds are typically processed within 5 to 10 business days. Actual credit time depends on
                your bank/payment method and the payment gateway.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
