import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { API_URL, getToken } from "../api/api";
import VulnerabilityCard from "../Components/Report/VulnerabilityCard";
import {
  filterReports,
  getUniqueVulnerabilityTypes,
  prepareReportsForDisplay,
  SEVERITY_FILTER_OPTIONS,
} from "../utils/reportUtils";

export default function Report() {
  const { scanId } = useParams();
  const [searchParams] = useSearchParams();
  const accessToken = searchParams.get("token");
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterVuln, setFilterVuln] = useState("");

  useEffect(() => {
    if (!scanId) return;
    let cancelled = false;
    let timeoutId;

    async function fetchReport() {
      try {
        const url = accessToken
          ? `${API_URL}/api/report/${scanId}?token=${encodeURIComponent(accessToken)}`
          : `${API_URL}/api/report/${scanId}`;
        const headers = {};
        const token = getToken();
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(url, { headers });
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          if (!res.ok) {
            const message = data.error || "Failed to load report";
            setError(message);
            setReport(null);

            // If backend says report is not ready yet, keep polling until webhook finishes and saves it
            if (res.status === 404 && typeof message === "string" && message.toLowerCase().includes("not ready")) {
              setIsWaiting(true);
              timeoutId = setTimeout(() => {
                if (!cancelled) {
                  setRetryCount((c) => c + 1);
                }
              }, 5000);
            } else {
              setIsWaiting(false);
            }
          } else {
            setReport(data);
            setError(null);
            setIsWaiting(false);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load report");
          setReport(null);
          setIsWaiting(false);
        }
      }
    }

    fetchReport();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [scanId, accessToken, retryCount]);

  const allVulns = useMemo(
    () => (report ? prepareReportsForDisplay(report) : []),
    [report]
  );
  const vulnTypeOptions = useMemo(() => getUniqueVulnerabilityTypes(allVulns), [allVulns]);
  const vulns = useMemo(
    () => filterReports(allVulns, { severity: filterSeverity, vulnerability: filterVuln }),
    [allVulns, filterSeverity, filterVuln]
  );
  const isVulnerabilitiesFormat = report
    ? Array.isArray(report.vulnerabilities) ||
      Array.isArray(report.reports) ||
      vulns.length > 0
    : false;
  if (isWaiting && !report) {
    return (
      <div className="flex flex-1 items-center justify-center py-16 px-6">
        <p className="text-sm text-gray-400">
          Report is not ready yet. Waiting for the scan to finish… this page will refresh automatically when the
          webhook sends the result.
        </p>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="flex flex-1 items-center justify-center py-16 px-6">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <p className="text-sm text-gray-400">Loading report...</p>
      </div>
    );
  }

  const hasSummary = typeof report.summary === "string" && report.summary.trim().length > 0;
  const hasLegacyFormat =
    !!report.scan_info ||
    !!report.request ||
    !!report.evidence ||
    !!report.risk_analysis ||
    (Array.isArray(report.impact) && report.impact.length > 0) ||
    (Array.isArray(report.affected_components) && report.affected_components.length > 0) ||
    (Array.isArray(report.recommendations) && report.recommendations.length > 0) ||
    (Array.isArray(report.references) && report.references.length > 0);

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-6">
      <div className="border-b border-slate-700 pb-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={20} className="text-blue-400" strokeWidth={1.5} />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Security Report</span>
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Vulnerability Assessment Report</h1>
        <p className="text-xs text-gray-400 mb-4">Confidential — Findings and remediation guidance</p>
      </div>

      {isVulnerabilitiesFormat && (
        <section className="mb-6 w-full min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Findings ({vulns.length}
              {(filterSeverity || filterVuln) && allVulns.length !== vulns.length ? ` of ${allVulns.length}` : ""})
            </h2>
            {allVulns.length > 0 && (
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <label className="flex flex-col gap-1 min-w-[10rem]">
                  <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Severity</span>
                  <select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500/60"
                  >
                    {SEVERITY_FILTER_OPTIONS.map((opt) => (
                      <option key={opt.value || "all"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 min-w-[10rem]">
                  <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Vulnerability</span>
                  <select
                    value={filterVuln}
                    onChange={(e) => setFilterVuln(e.target.value)}
                    className="bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500/60"
                  >
                    <option value="">All types</option>
                    {vulnTypeOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>
          {allVulns.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-6 text-center">
              <p className="text-gray-300 text-sm">No vulnerabilities detected.</p>
              <p className="text-gray-500 text-xs mt-1">The scan finished with no findings.</p>
            </div>
          ) : vulns.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-6 text-center">
              <p className="text-gray-300 text-sm">No findings match the current filters.</p>
              <button
                type="button"
                onClick={() => {
                  setFilterSeverity("");
                  setFilterVuln("");
                }}
                className="text-blue-400 hover:text-blue-300 text-xs mt-2"
              >
                Clear filters
              </button>
            </div>
          ) : (
          <div className="w-full min-w-0 space-y-3">
            {vulns.map((v, idx) => (
              <VulnerabilityCard key={`${v.type || v.vulnerability}-${idx}`} item={v} />
            ))}
          </div>
          )}
        </section>
      )}

      {!isVulnerabilitiesFormat && (
        <>
          {hasSummary && (
            <section className="mb-6">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Summary</h2>
              <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4 text-xs text-gray-300 whitespace-pre-wrap">
                {report.summary}
              </div>
            </section>
          )}

          {!hasLegacyFormat && (
            <section className="mb-6">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Raw Report</h2>
              <pre className="bg-slate-950 border border-slate-700 rounded-lg p-4 text-xs text-gray-300 whitespace-pre-wrap break-all">
                {JSON.stringify(report, null, 2)}
              </pre>
            </section>
          )}

          {hasLegacyFormat && (
            <>
              <section className="mb-6">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Scan Information</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-xs">
                  <div><span className="text-gray-500">Scan ID</span><p className="text-gray-300 font-mono">{report.scan_info?.scan_id ?? "—"}</p></div>
                  <div><span className="text-gray-500">Date</span><p className="text-gray-300">{report.scan_info?.scan_date ?? "—"}</p></div>
                  <div><span className="text-gray-500">Scanner</span><p className="text-gray-300">{report.scan_info?.scanner ?? "—"}</p></div>
                  <div><span className="text-gray-500">Target</span><p className="text-gray-300 truncate" title={report.scan_info?.target_ip}>{report.scan_info?.target_ip ?? "—"}</p></div>
                  <div><span className="text-gray-500">Duration</span><p className="text-gray-300">{report.scan_info?.scan_duration ?? "—"}</p></div>
                  <div><span className="text-gray-500">Status</span><p className="text-gray-300">{report.scan_info?.status ?? "—"}</p></div>
                </div>
              </section>

              <section className="mb-6">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Vulnerable Request</h2>
                <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4 text-xs">
                  <p className="text-gray-500 mb-1">URL</p>
                  <p className="text-gray-300 break-all font-mono mb-3">{report.request?.url ?? "—"}</p>
                  <p className="text-gray-500 mb-1">Method</p>
                  <p className="text-gray-300 font-mono mb-3">{report.request?.method ?? "—"}</p>
                  <p className="text-gray-500 mb-1">Payload</p>
                  <pre className="bg-slate-950 rounded p-2 text-gray-400 whitespace-pre-wrap break-all">
                    {report.request?.data ?? "—"}
                  </pre>
                </div>
              </section>

              <section className="mb-6">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Evidence & Findings</h2>
                <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4 text-xs space-y-3">
                  <p><span className="text-gray-500">Parameter:</span> <span className="text-gray-300">{report.evidence?.vulnerable_parameter ?? "—"}</span></p>
                  <p><span className="text-gray-500">DBMS:</span> <span className="text-gray-300">{report.evidence?.dbms ?? "—"}</span></p>
                  {report.evidence?.injection_techniques?.length > 0 && (
                    <>
                      <p className="text-gray-500">Injection techniques</p>
                      <ul className="list-disc ml-4 text-gray-300 space-y-0.5">
                        {report.evidence.injection_techniques.map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {report.evidence?.successful_payloads?.length > 0 && (
                    <>
                      <p className="text-gray-500">Successful payloads</p>
                      <div className="space-y-1">
                        {report.evidence.successful_payloads.map((p, i) => (
                          <pre
                            key={i}
                            className="bg-slate-950 rounded p-2 text-gray-400 whitespace-pre-wrap break-all"
                          >
                            {p}
                          </pre>
                        ))}
                      </div>
                    </>
                  )}
                  {report.evidence?.proof && <p className="text-gray-500 italic">{report.evidence.proof}</p>}
                </div>
              </section>

              <section className="mb-6">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Risk Analysis</h2>
                <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4 text-xs grid grid-cols-2 gap-2">
                  <p><span className="text-gray-500">CVSS</span> <span className="text-gray-300">{report.risk_analysis?.cvss_score ?? "—"}</span></p>
                  <p><span className="text-gray-500">Likelihood</span> <span className="text-gray-300">{report.risk_analysis?.likelihood ?? "—"}</span></p>
                  <p><span className="text-gray-500">Impact</span> <span className="text-gray-300">{report.risk_analysis?.impact_level ?? "—"}</span></p>
                  <p className="col-span-2"><span className="text-gray-500">Vector</span> <span className="text-gray-400 font-mono text-[11px] break-all">{report.risk_analysis?.cvss_vector ?? "—"}</span></p>
                </div>
              </section>

              {report.impact?.length > 0 && (
                <section className="mb-6">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Impact</h2>
                  <ul className="list-disc ml-4 text-xs text-gray-300 space-y-1">
                    {report.impact.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </section>
              )}

              {report.affected_components?.length > 0 && (
                <section className="mb-6">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Affected Components</h2>
                  <ul className="list-disc ml-4 text-xs text-gray-300 space-y-1">
                    {report.affected_components.map((comp, i) => (
                      <li key={i}>{comp}</li>
                    ))}
                  </ul>
                </section>
              )}

              {report.recommendations?.length > 0 && (
                <section className="mb-6">
                  <h2 className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-3">Recommended Fixes</h2>
                  <ul className="list-disc ml-4 text-xs text-gray-300 space-y-1">
                    {report.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </section>
              )}

              {report.references?.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">References</h2>
                  <ul className="space-y-1">
                    {report.references.map((ref, i) => (
                      <li key={i}>
                        <a href={ref.url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline break-all">
                          {ref.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
