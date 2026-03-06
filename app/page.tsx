"use client";

import { Button, Card, CardBody, Accordion, AccordionItem, Link } from "@heroui/react";
import { useRouter } from "next/navigation";

const SECTIONS = [
  {
    title: "Battery Snapshot",
    desc: "Current charge level, estimated range in miles & km, charge limit, and last charge timestamp.",
    icon: "🔋",
  },
  {
    title: "Vehicle Basics",
    desc: "VIN, year, make, model, trim, odometer reading, exterior and interior colors.",
    icon: "🚗",
  },
  {
    title: "Options & Configuration",
    desc: "Factory-installed options with human-readable names and raw option codes.",
    icon: "⚙️",
  },
  {
    title: "Software & System",
    desc: "Current firmware version, Autopilot hardware generation, and connectivity status.",
    icon: "💻",
  },
  {
    title: "Warranty Snapshot",
    desc: "Base and battery warranty limits, active/expired status, and expiration dates.",
    icon: "🛡️",
  },
];

const FAQ = [
  {
    q: "Do I have to share my Tesla password?",
    a: "No. We use Tesla's official OAuth authorization. Your password is never shared with or seen by our service.",
  },
  {
    q: "Is the connection read-only?",
    a: "Yes. We only request permission to read vehicle data. We cannot send any commands to your car.",
  },
  {
    q: "How long does it take?",
    a: "Usually 1–2 minutes. We pull live data from your vehicle, compile the report, and generate a PDF.",
  },
  {
    q: "Are you affiliated with Tesla?",
    a: "No. OUT CHECK is an independent service. We are not affiliated with, endorsed by, or connected to Tesla, Inc.",
  },
  {
    q: "How much does it cost?",
    a: "Currently free for all users.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const errorParam = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("error")
    : null;
  const errorMessage = errorParam === "oauth_not_configured"
    ? "Report generation is temporarily unavailable. Tesla OAuth is not configured yet."
    : errorParam === "auth_failed"
      ? "Tesla sign-in failed. Please try again."
      : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 pb-20 pt-24 text-center sm:pt-32">
        {errorMessage && (
          <Card className="mb-6 w-full max-w-2xl border border-red-500/30 bg-red-500/10">
            <CardBody>
              <p className="text-sm text-red-200">{errorMessage}</p>
            </CardBody>
          </Card>
        )}
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-5xl font-bold tracking-tight sm:text-6xl">
          OUT CHECK
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">
          Generate a detailed snapshot report of your Tesla — battery, options, warranty, and more.
          Share it with confidence when selling your car.
        </p>
        <Button
          color="primary"
          size="lg"
          className="mt-8 text-base font-semibold"
          onPress={() => router.push("/api/auth/tesla/start")}
        >
          Generate Report
        </Button>
        <Card className="mt-5 w-full max-w-xl border border-white/10 bg-slate-900/70">
          <CardBody className="flex flex-col items-center gap-3 py-4 sm:flex-row sm:justify-between">
            <p className="text-sm text-slate-300">Want to see the final format first?</p>
            <Button
              as={Link}
              href="/r/sample"
              color="secondary"
              variant="flat"
              size="sm"
            >
              View Sample Report
            </Button>
          </CardBody>
        </Card>
        <p className="mt-3 text-sm text-slate-500">
          Free · Read-only · No password shared
        </p>
      </section>

      {/* What's inside */}
      <section className="mx-auto max-w-5xl px-4 pb-20">
        <h2 className="mb-8 text-center font-[family-name:var(--font-manrope)] text-2xl font-bold">
          What&apos;s Inside Your Report
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => (
            <Card
              key={s.title}
              className="border border-white/10 bg-slate-800/60"
            >
              <CardBody className="gap-2">
                <div className="text-3xl">{s.icon}</div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="text-sm text-slate-400">{s.desc}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-2xl px-4 pb-24">
        <h2 className="mb-8 text-center font-[family-name:var(--font-manrope)] text-2xl font-bold">
          FAQ
        </h2>
        <Accordion variant="bordered" className="border-white/10">
          {FAQ.map((item, i) => (
            <AccordionItem
              key={i}
              aria-label={item.q}
              title={<span className="text-white">{item.q}</span>}
              className="text-slate-300"
            >
              {item.a}
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-xs text-slate-600">
        Not affiliated with Tesla, Inc.
      </footer>
    </main>
  );
}
