"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Spinner } from "@heroui/react";
import ReportSections from "@/components/ReportSections";
import type { ReportDetail } from "@/lib/types";

export default function OwnerReportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/reports/${id}`)
      .then((res) => {
        if (res.status === 401) { router.push("/"); return null; }
        if (!res.ok) throw new Error("Report not found");
        return res.json();
      })
      .then((data) => { if (data) setReport(data); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <Spinner size="lg" />
      </main>
    );
  }

  if (error || !report) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-white">
        <p className="text-red-400">{error ?? "Report not found"}</p>
        <Button onPress={() => router.push("/dashboard")}>Back to Dashboard</Button>
      </main>
    );
  }

  const shareUrl = report.share_token
    ? `${window.location.origin}/r/${report.share_token}`
    : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="flat" size="sm" onPress={() => router.push("/dashboard")}>
            ← Dashboard
          </Button>
          <div className="flex gap-2">
            {shareUrl && (
              <Button
                variant="flat"
                size="sm"
                onPress={() => navigator.clipboard.writeText(shareUrl)}
              >
                Copy Share Link
              </Button>
            )}
            {report.pdf_url && (
              <Button
                variant="flat"
                size="sm"
                as="a"
                href={report.pdf_url}
                target="_blank"
              >
                Download PDF
              </Button>
            )}
          </div>
        </div>

        {report.sections ? (
          <ReportSections sections={report.sections} reportNumber={report.report_number} />
        ) : (
          <p className="text-center text-slate-400">Report data is not available yet.</p>
        )}
      </div>
    </main>
  );
}
