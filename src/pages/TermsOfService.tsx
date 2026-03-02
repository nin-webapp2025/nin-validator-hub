import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsOfService() {
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
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Terms of Service</h1>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using SparkID, you agree to be bound by these Terms of Service.
              If you do not agree to these terms, you may not use our services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">2. Service Description</h2>
            <p className="text-muted-foreground leading-relaxed">
              SparkID provides identity verification services including NIN validation, BVN verification,
              clearance services, and personalization tracking for Nigerian National Identification Numbers.
              Our services are provided through authorized government API integrations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">3. User Responsibilities</h2>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials
              and for all activities that occur under your account. You agree to use our services
              only for lawful purposes and in accordance with applicable Nigerian data protection laws.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">4. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed">
              You may not use SparkID to verify identities without proper authorization, attempt to
              circumvent security measures, or use the service for fraudulent purposes. Any misuse
              may result in immediate account termination.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">5. Service Availability</h2>
            <p className="text-muted-foreground leading-relaxed">
              While we strive for 99.9% uptime, we do not guarantee uninterrupted service availability.
              Verification results depend on third-party government APIs and may be subject to downtime
              or rate limiting outside our control.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">6. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              SparkID is provided "as is" without warranties of any kind. We are not liable for any
              damages arising from the use of our services, including but not limited to incorrect
              verification results from third-party APIs.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">7. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these terms at any time. Continued use of the service
              after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">8. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these terms, please contact{" "}
              <a href="mailto:legal@sparkid.ng" className="text-primary hover:underline">
                legal@sparkid.ng
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
