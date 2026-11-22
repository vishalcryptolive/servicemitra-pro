"use client";

import React, { useState } from "react";

type PolicyTab = "privacy" | "terms" | "refund";

export default function HomePage() {
  const [activePolicy, setActivePolicy] = useState<PolicyTab>("refund");
  const [selectedPlan, setSelectedPlan] = useState<string>("Pro Monthly (₹499)");

  const supportEmail = "thevishalrai.official@gmail.com";
  const businessLocation = "New Delhi, India";

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow">
              SM
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">
                ServiceMitra
              </span>
              <span className="ml-2 hidden rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-medium text-indigo-300 sm:inline-block">
                Service Management & Billing
              </span>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-300 md:flex">
            <button
              type="button"
              onClick={() => scrollToSection("features")}
              className="hover:text-white transition"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("pricing")}
              className="hover:text-white transition"
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("policies")}
              className="hover:text-white transition"
            >
              Policies
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("contact")}
              className="hover:text-white transition"
            >
              Contact
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition"
            >
              Login / Open App
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-14">
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 p-8 md:p-12">
          <p className="inline-block rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-300">
            Built for Service Providers, Technicians & Local Businesses
          </p>
          <h1 className="mt-5 max-w-3xl text-3xl font-extrabold leading-tight text-white sm:text-5xl">
            Manage bookings, client records, and billing in one simple workspace.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            ServiceMitra helps independent service professionals and small service
            teams organize customer requests, track job status, and manage
            subscription billing cleanly without spreadsheets.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => scrollToSection("pricing")}
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition"
            >
              View Plans
            </button>
            <a
              href="/dashboard"
              className="rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-800 transition"
            >
              Continue to App
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-12">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Everything you need to run daily service operations
          </h2>
          <p className="mt-2 text-slate-400">
            Designed for speed, clarity, and everyday reliability on desktop and
            mobile browsers.
          </p>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h3 className="text-lg font-semibold text-white">
              Service Booking & Entries
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Log incoming service requests, schedule visits, and keep track of
              pending, in-progress, and completed work in one place.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h3 className="text-lg font-semibold text-white">
              Clear Billing & Records
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Keep service charges, customer details, and payment status
              organized so billing is transparent and easy to review.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h3 className="text-lg font-semibold text-white">
              Subscription & Pro Access
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Activate Pro access with clear validity periods and manage your
              account status directly inside the application.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-14">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-2 text-slate-400">
            Choose the plan that fits your service business. All prices are in
            INR (₹).
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {/* Monthly Plan */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-7">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Pro Monthly</h3>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                  Monthly Billing
                </span>
              </div>
              <p className="mt-4 text-4xl font-extrabold text-white">
                ₹499
                <span className="text-sm font-normal text-slate-400">
                  {" "}
                  / month
                </span>
              </p>
              <p className="mt-3 text-sm text-slate-400">
                Ideal for individual service providers getting started with
                structured booking and billing workflows.
              </p>

              <ul className="mt-6 space-y-2.5 text-sm text-slate-300">
                <li>• Service booking & job tracking</li>
                <li>• Customer & billing entry management</li>
                <li>• Standard dashboard & cloud access</li>
                <li>• Email support ({supportEmail})</li>
              </ul>
            </div>

            <div className="mt-8">
              <a
                href="/dashboard?plan=monthly"
                onClick={() => setSelectedPlan("Pro Monthly (₹499)")}
                className="block w-full rounded-xl bg-slate-800 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-slate-700 transition"
              >
                Select ₹499 / month
              </a>
            </div>
          </div>

          {/* Annual / Growth Plan */}
          <div className="flex flex-col justify-between rounded-2xl border border-indigo-500/50 bg-slate-900 p-7 shadow-lg shadow-indigo-950/30">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Pro Annual</h3>
                <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300">
                  Best Value
                </span>
              </div>
              <p className="mt-4 text-4xl font-extrabold text-white">
                ₹1,999
                <span className="text-sm font-normal text-slate-400">
                  {" "}
                  / year
                </span>
              </p>
              <p className="mt-3 text-sm text-slate-400">
                Designed for growing service businesses that want uninterrupted
                annual access and priority support.
              </p>

              <ul className="mt-6 space-y-2.5 text-sm text-slate-300">
                <li>• Everything in Pro Monthly</li>
                <li>• Full 12-month subscription validity</li>
                <li>• Higher operational capacity & reporting</li>
                <li>• Priority email support ({supportEmail})</li>
              </ul>
            </div>

            <div className="mt-8">
              <a
                href="/dashboard?plan=annual"
                onClick={() => setSelectedPlan("Pro Annual (₹1,999)")}
                className="block w-full rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-indigo-500 transition"
              >
                Select ₹1,999 / year
              </a>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Selected reference: {selectedPlan}. Subscription activation and
          renewal terms are governed by the Refund & Cancellation Policy below.
        </p>
      </section>

      {/* Policies Section */}
      <section id="policies" className="mx-auto max-w-6xl px-4 py-14">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Policies & Terms
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Clear terms covering privacy, service usage, and subscription
                cancellations.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActivePolicy("refund")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  activePolicy === "refund"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                Refund & Cancellation
              </button>
              <button
                type="button"
                onClick={() => setActivePolicy("privacy")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  activePolicy === "privacy"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => setActivePolicy("terms")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  activePolicy === "terms"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                Terms & Conditions
              </button>
            </div>
          </div>

          <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-300">
            {activePolicy === "refund" && (
              <>
                <h3 className="text-lg font-semibold text-white">
                  Cancellation & Refund Policy
                </h3>
                <p>
                  <strong>No Refund After Activation:</strong> Because
                  ServiceMitra provides immediate digital software access upon
                  payment confirmation, all completed subscription payments are{" "}
                  <strong>non-refundable</strong> once activated.
                </p>
                <p>
                  <strong>Cancel Anytime (Future Billing):</strong> You may
                  cancel your subscription or stop future renewals at any time.
                  Cancelling prevents future billing cycles, while your current
                  active period remains usable until its scheduled expiry date.
                </p>
                <p>
                  <strong>Technical or Duplicate Payment Exceptions:</strong> If a
                  payment is deducted more than once for the same order or fails
                  to activate due to a verified technical error, please contact{" "}
                  <a
                    href={`mailto:${supportEmail}`}
                    className="text-indigo-400 underline"
                  >
                    {supportEmail}
                  </a>{" "}
                  with your payment reference ID so our team can review and
                  resolve the discrepancy.
                </p>
              </>
            )}

            {activePolicy === "privacy" && (
              <>
                <h3 className="text-lg font-semibold text-white">
                  Privacy Policy
                </h3>
                <p>
                  ServiceMitra collects only the account, business, and
                  operational information necessary to authenticate users,
                  maintain service records, and provide software functionality.
                </p>
                <p>
                  We do not sell personal or customer data to third parties.
                  Payment transactions are processed through authorized payment
                  gateway partners; sensitive card or banking credentials are
                  handled directly by the payment processor and are not stored
                  in plain text by ServiceMitra.
                </p>
                <p>
                  For data or privacy queries, reach out to{" "}
                  <a
                    href={`mailto:${supportEmail}`}
                    className="text-indigo-400 underline"
                  >
                    {supportEmail}
                  </a>
                  .
                </p>
              </>
            )}

            {activePolicy === "terms" && (
              <>
                <h3 className="text-lg font-semibold text-white">
                  Terms & Conditions
                </h3>
                <p>
                  By accessing or using ServiceMitra, you agree to use the
                  platform lawfully and accurately for legitimate service
                  management and billing purposes.
                </p>
                <p>
                  Users are responsible for maintaining the confidentiality of
                  their login credentials and for the accuracy of records entered
                  into their workspace. Subscription access is subject to timely
                  payment and plan validity.
                </p>
                <p>
                  ServiceMitra reserves the right to update features, pricing, or
                  policies as the product evolves, with updated terms published
                  on this page.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="mx-auto max-w-6xl px-4 pt-4 pb-16">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8">
          <h2 className="text-2xl font-bold text-white">Contact Us</h2>
          <p className="mt-2 text-sm text-slate-400">
            Have questions about plans, onboarding, or your ServiceMitra
            account? Reach out using the details below.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Support Email
              </p>
              <a
                href={`mailto:${supportEmail}`}
                className="mt-1 block text-base font-medium text-indigo-400 hover:underline"
              >
                {supportEmail}
              </a>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Location
              </p>
              <p className="mt-1 text-base font-medium text-white">
                {businessLocation}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-950 py-6 text-sm text-slate-400">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <p>
            © {new Date().getFullYear()} ServiceMitra • {businessLocation}
          </p>
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => {
                setActivePolicy("refund");
                scrollToSection("policies");
              }}
              className="hover:text-white transition"
            >
              Refund & Cancellation
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePolicy("privacy");
                scrollToSection("policies");
              }}
              className="hover:text-white transition"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePolicy("terms");
                scrollToSection("policies");
              }}
              className="hover:text-white transition"
            >
              Terms & Conditions
            </button>
            <a
              href={`mailto:${supportEmail}`}
              className="hover:text-white transition"
            >
              {supportEmail}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
