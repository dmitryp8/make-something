"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, CardBody, CardHeader, Chip, Spinner, Divider } from "@heroui/react";
import { useRouter } from "next/navigation";
import type { VehicleListItem, ReportListItem } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([]);
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicles = useCallback(async (forceRefresh = false) => {
    try {
      const res = await fetch(`/api/vehicles${forceRefresh ? "?force_refresh=true" : ""}`);
      if (res.status === 401) { router.push("/"); return; }
      const data = await res.json();
      setVehicles(data);
    } catch {
      setError("Failed to load vehicles");
    } finally {
      setLoadingVehicles(false);
    }
  }, [router]);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch("/api/reports");
      if (res.status === 401) { router.push("/"); return; }
      const data = await res.json();
      setReports(data);
    } catch {
      setError("Failed to load reports");
    } finally {
      setLoadingReports(false);
    }
  }, [router]);

  // Initial load — force refresh vehicles from Tesla on first visit
  useEffect(() => {
    fetchVehicles(true);
    fetchReports();
  }, [fetchVehicles, fetchReports]);

  // Poll reports while any are processing
  useEffect(() => {
    const hasProcessing = reports.some((r) => r.status === "pending" || r.status === "processing");
    if (!hasProcessing) return;

    const id = setInterval(() => fetchReports(), 5000);
    return () => clearInterval(id);
  }, [reports, fetchReports]);

  const generateReport = async (vehicleId: string) => {
    setGenerating(vehicleId);
    setError(null);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle_id: vehicleId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create report");
        return;
      }

      // Refresh reports to show the new one
      await fetchReports();
    } catch {
      setError("Failed to create report");
    } finally {
      setGenerating(null);
    }
  };

  const copyShareLink = (token: string) => {
    const url = `${window.location.origin}/r/${token}`;
    navigator.clipboard.writeText(url);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "ready": return "success";
      case "processing":
      case "pending": return "warning";
      case "failed": return "danger";
      default: return "default";
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-3xl font-bold">Dashboard</h1>
          <Button variant="flat" size="sm" onPress={() => router.push("/")}>
            Home
          </Button>
        </div>

        {error && (
          <Card className="mb-6 border border-red-500/30 bg-red-500/10">
            <CardBody><p className="text-sm text-red-200">{error}</p></CardBody>
          </Card>
        )}

        {/* Vehicles */}
        <Card className="mb-6 border border-white/10 bg-slate-800/60">
          <CardHeader>
            <h2 className="font-[family-name:var(--font-manrope)] text-xl font-semibold">Your Vehicles</h2>
          </CardHeader>
          <CardBody className="gap-3">
            {loadingVehicles ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : vehicles.length === 0 ? (
              <p className="text-sm text-slate-400">No vehicles found. Make sure your Tesla account has vehicles associated.</p>
            ) : (
              vehicles.map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/50 p-4">
                  <div>
                    <p className="font-semibold">{v.year} {v.make} {v.model} {v.trim ?? ""}</p>
                    <p className="font-mono text-xs text-slate-400">{v.vin}</p>
                    {v.odometer_miles && (
                      <p className="text-xs text-slate-500">{v.odometer_miles.toLocaleString()} miles</p>
                    )}
                  </div>
                  <Button
                    color="primary"
                    size="sm"
                    isLoading={generating === v.id}
                    onPress={() => generateReport(v.id)}
                  >
                    Generate Report
                  </Button>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Divider className="my-6 bg-white/10" />

        {/* Reports */}
        <Card className="border border-white/10 bg-slate-800/60">
          <CardHeader>
            <h2 className="font-[family-name:var(--font-manrope)] text-xl font-semibold">Your Reports</h2>
          </CardHeader>
          <CardBody className="gap-3">
            {loadingReports ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : reports.length === 0 ? (
              <p className="text-sm text-slate-400">No reports yet. Generate one from your vehicles above.</p>
            ) : (
              reports.map((r) => (
                <div key={r.id} className="rounded-lg border border-white/10 bg-slate-900/50 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">
                        {r.vehicle.year} {r.vehicle.model}
                        <span className="ml-2 font-mono text-xs text-slate-500">{r.vehicle.vin}</span>
                      </p>
                      <p className="text-xs text-slate-400">{r.report_number}</p>
                      {r.generated_at && (
                        <p className="text-xs text-slate-500">
                          {new Date(r.generated_at).toLocaleDateString("en-US", {
                            year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      )}
                    </div>
                    <Chip color={statusColor(r.status)} variant="flat" size="sm">
                      {r.status}
                    </Chip>
                  </div>

                  {r.status === "ready" && (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="flat" onPress={() => router.push(`/report/${r.id}`)}>
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="flat"
                        onPress={() => {
                          fetch(`/api/reports/${r.id}`)
                            .then((res) => res.json())
                            .then((data) => {
                              if (data.share_token) copyShareLink(data.share_token);
                            });
                        }}
                      >
                        Copy Share Link
                      </Button>
                      {/* PDF download would go through pdf_url */}
                    </div>
                  )}

                  {(r.status === "pending" || r.status === "processing") && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                      <Spinner size="sm" /> Generating report...
                    </div>
                  )}
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
