"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Card, CardBody, Chip, Divider, Image, Spinner } from "@heroui/react";
import { toDataURL } from "qrcode";
import ReportSections from "@/components/ReportSections";
import type { SectionsJson } from "@/lib/types";
import { SAMPLE_PUBLIC_REPORT } from "@/lib/sample-report";

interface PublicReport {
  report_number: string;
  vehicle: {
    vin: string;
    make: string;
    model: string;
    year: number;
    trim: string | null;
  };
  sections: SectionsJson | null;
  pdf_url: string | null;
  generated_at: string | null;
}

export default function PublicReportPage() {
  const { token } = useParams<{ token: string }>();
  const [report, setReport] = useState<PublicReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  const fmtDateTime = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    if (!token) return;
    if (token === "sample") {
      setReport(SAMPLE_PUBLIC_REPORT);
      setError(null);
      setLoading(false);
      return;
    }

    fetch(`/api/public/report/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Report not found");
        return res.json();
      })
      .then(setReport)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);
  const shareUrl = token && typeof window !== "undefined"
    ? `${window.location.origin}/r/${token}`
    : "";

  useEffect(() => {
    if (!shareUrl) return;

    let cancelled = false;

    toDataURL(shareUrl, {
      margin: 1,
      width: 320,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl("");
      });

    return () => {
      cancelled = true;
    };
  }, [shareUrl]);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-white">
        <Spinner size="lg" />
        <p className="text-sm text-slate-400">Loading public report...</p>
      </main>
    );
  }

  if (error || !report || !report.sections) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-white">
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold">OUT CHECK</h1>
        <p className="text-slate-400">{error ?? "Report not found or not ready yet."}</p>
        <Button as="a" href="/" variant="flat" size="sm">
          Create Your Own Report
        </Button>
      </main>
    );
  }
  const { vehicle, sections } = report;
  const vehicleTitle = `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ""}`;
  const batteryLevel = sections.battery_snapshot.battery_level_percent;
  const rangeMiles = sections.battery_snapshot.est_range_miles;
  const odometer = sections.vehicle_basics.odometer_miles;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 px-4 py-8 text-white print:min-h-0 print:bg-white print:px-0 print:py-0 print:text-slate-900 sm:px-8">
      <div className="mx-auto max-w-4xl print:max-w-none">
        <Card className="mb-6 border border-white/10 bg-slate-900/70 backdrop-blur print:mb-4 print:rounded-none print:border-slate-200 print:bg-white print:shadow-none">
          <CardBody className="gap-5 p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 print:text-slate-600">Public Vehicle Report</p>
                <h1 className="mt-2 font-[family-name:var(--font-space-grotesk)] text-3xl font-bold print:text-slate-900">OUT CHECK</h1>
                <p className="mt-1 text-slate-300 print:text-slate-700">{vehicleTitle}</p>
                <p className="font-mono text-xs text-slate-500">VIN: {vehicle.vin}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Chip variant="flat" color="primary" size="sm">{report.report_number}</Chip>
                <Chip variant="flat" size="sm">Generated {fmtDateTime(report.generated_at)}</Chip>
              </div>
            </div>

            <Divider className="bg-white/10" />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border border-white/10 bg-slate-800/60 print:border-slate-200 print:bg-white">
                <CardBody className="gap-1 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Battery</p>
                  <p className="text-xl font-semibold print:text-slate-900">{batteryLevel !== null ? `${batteryLevel}%` : "—"}</p>
                </CardBody>
              </Card>
              <Card className="border border-white/10 bg-slate-800/60 print:border-slate-200 print:bg-white">
                <CardBody className="gap-1 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Estimated Range</p>
                  <p className="text-xl font-semibold print:text-slate-900">{rangeMiles !== null ? `${rangeMiles} mi` : "—"}</p>
                </CardBody>
              </Card>
              <Card className="border border-white/10 bg-slate-800/60 print:border-slate-200 print:bg-white">
                <CardBody className="gap-1 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Odometer</p>
                  <p className="text-xl font-semibold print:text-slate-900">{odometer !== null ? `${odometer.toLocaleString()} mi` : "—"}</p>
                </CardBody>
              </Card>
              <Card className="border border-white/10 bg-slate-800/60 print:border-slate-200 print:bg-white">
                <CardBody className="gap-1 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Warranty</p>
                  <p className="text-xl font-semibold print:text-slate-900">
                    {sections.warranty_snapshot.in_battery_warranty ? "Active" : "Expired"}
                  </p>
                </CardBody>
              </Card>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button onPress={() => window.print()} color="secondary">
                Print Report
              </Button>
              {report.pdf_url && (
                <Button as="a" href={report.pdf_url} target="_blank" rel="noreferrer" color="primary">
                  Download PDF
                </Button>
              )}
              <Button as="a" href="/" variant="flat">
                Create Your Own Report
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card className="mb-6 border border-white/10 bg-slate-900/70 print:mb-4 print:break-inside-avoid print:rounded-none print:border-slate-200 print:bg-white print:shadow-none">
          <CardBody className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 print:text-slate-600">Verification Link</p>
              <p className="text-sm text-slate-300 print:text-slate-700">
                Scan this QR to open the live public report.
              </p>
              <p className="break-all font-mono text-xs text-slate-400 print:text-slate-600">
                {shareUrl || "Generating link..."}
              </p>
              <div className="print:hidden">
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() => {
                    if (shareUrl) navigator.clipboard.writeText(shareUrl);
                  }}
                  isDisabled={!shareUrl}
                >
                  Copy Link
                </Button>
              </div>
            </div>
            <div className="mx-auto sm:mx-0">
              {qrDataUrl ? (
                <Image
                  src={qrDataUrl}
                  alt="QR code for this public report link"
                  width={160}
                  height={160}
                  className="rounded-xl border border-white/10 bg-white p-2 print:border-slate-300"
                />
              ) : (
                <div className="flex h-40 w-40 items-center justify-center rounded-xl border border-white/10 bg-slate-800/60 print:border-slate-300 print:bg-slate-100">
                  <Spinner size="sm" />
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        <ReportSections
          sections={sections}
          reportNumber={report.report_number}
          showHeader={false}
          showFooter={false}
        />

        <div className="mt-8 text-center text-xs text-slate-600 print:mt-4 print:text-slate-500">
          <p>Not affiliated with Tesla, Inc.</p>
          <p>Generated {fmtDateTime(sections.meta.generated_at)} · v{sections.meta.generator_version}</p>
        </div>
      </div>
    </main>
  );
}
