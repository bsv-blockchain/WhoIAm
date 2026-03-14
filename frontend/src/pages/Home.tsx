import { useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { VerificationCard } from "@/components/VerificationCard";
import { Button } from "@/components/ui/button";
import { Phone, ArrowRight, ArrowDown, Copy, Check } from "lucide-react";
import { XLogo } from "@/components/icons/XLogo";
import { GoogleLogo } from "@/components/icons/GoogleLogo";
import { getCertifierConfig } from "@/lib/constants";
import { motion } from "framer-motion";

export default function Home() {
  const [copied, setCopied] = useState(false);
  const { certifierUrl } = getCertifierConfig();

  const handleCopy = () => {
    navigator.clipboard.writeText(certifierUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Shell>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 sm:mb-16"
        >
          <h1 className="text-3xl sm:text-5xl font-bold text-text-primary tracking-tight mb-6 sm:mb-8">
            Choose how people
            <br />
            see you
          </h1>

          {/* Before / After visual */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-8 max-w-2xl mx-auto">
            {/* Before */}
            <div className="flex-1 w-full rounded-xl border border-border bg-surface px-4 py-4">
              <p className="text-[10px] font-medium text-text-secondary uppercase tracking-wider mb-2">
                Without Who I Am
              </p>
              <p className="font-mono text-xs text-text-secondary break-all leading-relaxed">
                02da1df0360bead34cb0e06ca3d18a9c7b9cf066c1b48b6ad867e485832438d703
              </p>
            </div>

            <ArrowRight className="h-5 w-5 text-primary shrink-0 hidden sm:block" />
            <ArrowDown className="h-5 w-5 text-primary shrink-0 sm:hidden" />

            {/* After */}
            <div className="flex-1 w-full rounded-xl border-2 border-primary bg-white px-4 py-4 shadow-sm">
              <p className="text-[10px] font-medium text-primary uppercase tracking-wider mb-2">
                With Who I Am
              </p>
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <span
                    className="text-2xl"
                    role="img"
                    aria-label="person raising hand"
                  >
                    &#x1F64B;&#x1F3FC;&#x200D;&#x2642;&#xFE0F;
                  </span>
                  <span className="text-lg font-semibold text-text-primary">
                    @satoshi
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary">
                  X account verified by Who I Am
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Verification cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="grid gap-4 sm:gap-6 sm:grid-cols-3 max-w-3xl mx-auto"
        >
          <VerificationCard
            icon={XLogo}
            title="Handle"
            description="Verify your X account"
            href="/verify/x"
            accentColor="bg-zinc-100 text-zinc-800"
          />
          <VerificationCard
            icon={GoogleLogo}
            title="Google"
            description="Verify your account"
            href="/verify/google"
            accentColor="bg-white border border-border"
          />
          <VerificationCard
            icon={Phone}
            title="Phone"
            description="Verify your phone number"
            href="/verify/phone"
            accentColor="bg-emerald-50 text-emerald-600"
          />
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-14 sm:mt-20"
        >
          <h2 className="text-xl font-semibold text-text-primary mb-10 text-center">
            You're always in control.
          </h2>

          {/* Steps */}
          <div className="flex flex-col sm:flex-row items-start justify-center gap-6 sm:gap-4 mb-12">
            {[
              {
                n: 1,
                title: "Verify Once",
                body: "We confirm access, and issue certificates.",
              },
              {
                n: 2,
                title: "Keep Your Data",
                body: "You hold the certificates we issue — not us.",
              },
              {
                n: 3,
                title: "Your Decision",
                body: "Publish, or grant access to apps on request.",
              },
            ].map(({ n, title, body }, i, arr) => (
              <div
                key={n}
                className="flex sm:flex-col items-start sm:items-center gap-4 flex-1 max-w-xs"
              >
                <div className="flex items-center gap-3 sm:flex-col sm:gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-semibold">
                    {n}
                  </span>
                </div>
                <div className="sm:text-center">
                  <p className="text-sm font-medium text-text-primary mb-0.5">
                    {title}
                  </p>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Trust Network panel */}
          <div className="rounded-xl border border-border bg-surface p-5 sm:p-6 max-w-2xl mx-auto">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1">
              For wallet users
            </p>
            <p className="text-sm font-medium text-text-primary mb-1">
              Add to your Trust Network
            </p>
            <p className="text-sm text-text-secondary mb-4">
              To trust certificates from Who I Am, add this service as a trusted
              Provider in your BRC-100 wallet settings by pasting in the URL
              below.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 min-w-0 truncate rounded-lg border border-border bg-white px-3 py-2 text-sm font-mono text-text-primary">
                {certifierUrl}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </Shell>
  );
}
