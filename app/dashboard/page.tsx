"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, CardBody, CardHeader, Chip, Spinner, Divider } from "@heroui/react";
import { useRouter } from "next/navigation";
import type { VehicleListItem, ReportListItem } from "@/lib/types";
import type { CompareDelta } from "@/lib/compare";

export default function DashboardPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([]);
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compareFromId, setCompareFromId] = useState<string | null>(null);
  const [deltaData, setDeltaData] = useState<{ fromId: string; delta: CompareDelta } | null>(null);
  const [deltaLoading, setDeltaLoading] = useState(false);

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

  const loadDelta = async (fromId: string, withId: string) => {
    setDeltaLoading(true);
    try {
      const res = await fetch(`/api/reports/${fromId}?compareWith=${withId}`);
      const data = await res.json();
      if (data.delta) setDeltaData({ fromId, delta: data.delta });
    } catch {
      // leave deltaData as-is
    } finally {
      setDeltaLoading(false);
    }
  };

  const openCompare = (reportId: string) => {
    if (compareFromId === reportId) {
      setCompareFromId(null);
      setDeltaData(null);
    } else {
      setCompareFromId(reportId);
      setDeltaData(null);
    }
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

  const deltaSign = (n: number | null) => {
    if (n === null) return "—";
    return n > 0 ? `+${n}` : `${n}`;
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
              reports.map((r) => {
                const otherReady = reports.filter(
                  (x) => x.id !== r.id && x.status === "ready" && x.vehicle.vin === r.vehicle.vin,
                );
                const isCompareOpen = compareFromId === r.id;
                const delta = deltaData?.fromId === r.id ? deltaData.delta : null;

                return (
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
                        {otherReady.length > 0 && (
                          <Button
                            size="sm"
                            variant={isCompareOpen ? "solid" : "flat"}
                            color={isCompareOpen ? "primary" : "default"}
                            onPress={() => openCompare(r.id)}
                          >
                            Compare
                          </Button>
                        )}
                      </div>
                    )}

                    {r.status === "ready" && isCompareOpen && (
                      <div className="mt-3 rounded-lg border border-white/10 bg-slate-950/60 p-3">
                        <p className="mb-2 text-xs font-semibold text-slate-300">Compare against:</p>
                        <div className="flex flex-col gap-1">
                          {otherReady.map((other) => (
                            <button
                              key={other.id}
                              className="flex items-center justify-between rounded px-2 py-1 text-left text-xs hover:bg-white/10"
                              onClick={() => loadDelta(r.id, other.id)}
                            >
                              <span className="text-slate-300">{other.report_number}</span>
                              <span className="text-slate-500">
                                {other.generated_at
                                  ? new Date(other.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                  : "—"}
                              </span>
                            </button>
                          ))}
                        </div>

                        {deltaLoading && (
                          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                            <Spinner size="sm" /> Loading comparison...
                          </div>
                        )}

                        {delta && !deltaLoading && (
                          <div className="mt-3">
                            <p className="mb-1 text-xs text-slate-400">
                              vs {delta.previous_report_number}
                              {delta.days_between !== null ? ` · ${delta.days_between} days` : ""}
                            </p>
                            <table className="w-full text-xs">
                              <tbody>
                                {delta.odometer_delta !== null && (
                                  <tr className="border-t border-white/5">
                                    <td className="py-1 text-slate-400">Odometer</td>
                                    <td className="py-1 text-right font-mono text-slate-200">
                                      {deltaSign(delta.odometer_delta)} mi
                                    </td>
                                  </tr>
                                )}
                                {delta.battery_delta !== null && (
                                  <tr className="border-t border-white/5">
                                    <td className="py-1 text-slate-400">Usable battery</td>
                                    <td className="py-1 text-right font-mono text-slate-200">
                                      {deltaSign(delta.battery_delta)}%
                                    </td>
                                  </tr>
                                )}
                                {delta.range_delta !== null && (
                                  <tr className="border-t border-white/5">
                                    <td className="py-1 text-slate-400">Est. range</td>
                                    <td className="py-1 text-right font-mono text-slate-200">
                                      {deltaSign(delta.range_delta)} mi
                                    </td>
                                  </tr>
                                )}
                                {delta.health_score_delta !== null && (
                                  <tr className="border-t border-white/5">
                                    <td className="py-1 text-slate-400">Health score</td>
                                    <td className={`py-1 text-right font-mono ${delta.health_score_delta >= 0 ? "text-green-400" : "text-red-400"}`}>
                                      {deltaSign(delta.health_score_delta)} pts
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {(r.status === "pending" || r.status === "processing") && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                        <Spinner size="sm" /> Generating report...
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
