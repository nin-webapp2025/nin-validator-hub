import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button variant="ghost" asChild className="mb-6 gap-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>

        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">1. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">
              SparkID collects the minimum information necessary to provide identity verification services.
              This includes your email address and name for account creation, and National Identification
              Numbers (NIN) or Bank Verification Numbers (BVN) submitted for verification purposes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">2. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your information is used solely to process identity verification requests, maintain your account,
              and provide customer support. We do not sell, rent, or share your personal data with third parties
              except as required by law or to process your verification requests through authorized government APIs.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">3. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement bank-level security measures including encrypted data transmission (TLS/SSL),
              encrypted storage at rest, and strict access controls. All verification data is processed
              through secure, authorized channels.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">4. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              Verification history is retained for your records and can be exported or deleted at any time
              through your account settings. Account deletion will permanently remove all associated data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">5. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              You have the right to access, correct, export, or delete your personal data at any time.
              You can manage these settings from your profile dashboard or by contacting our support team.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">6. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              For privacy-related inquiries, please contact us at{" "}
              <a href="mailto:privacy@sparkid.ng" className="text-primary hover:underline">
                privacy@sparkid.ng
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
