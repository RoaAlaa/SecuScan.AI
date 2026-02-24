import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { API_URL, getToken } from "../api/api";

export default function Report() {
  const { scanId } = useParams();
  const [searchParams] = useSearchParams();
  const accessToken = searchParams.get("token");
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!scanId) return;
    let cancelled = false;

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
            setError(data.error || "Failed to load report");
            setReport(null);
          } else {
            setReport(data);
            setError(null);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load report");
          setReport(null);
        }
      }
    }

    fetchReport();
    return () => { cancelled = true; };
  }, [scanId, accessToken]);

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

  const severityClass =
    (report.severity || "").toLowerCase() === "critical"
      ? "bg-red-500/20 text-red-400 border-red-500/50"
      : (report.severity || "").toLowerCase() === "high"
        ? "bg-orange-500/20 text-orange-400 border-orange-500/50"
        : "bg-amber-500/20 text-amber-400 border-amber-500/50";

  const vulns = report.vulnerabilities || [];
  const isVulnerabilitiesFormat = vulns.length > 0;
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
    <div className="py-8 px-6 max-w-4xl mx-auto">
      <div className="border-b border-slate-700 pb-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={20} className="text-blue-400" strokeWidth={1.5} />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Security Report</span>
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Vulnerability Assessment Report</h1>
        <p className="text-xs text-gray-400 mb-4">Confidential — Findings and remediation guidance</p>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-semibold ${severityClass}`}>
            <AlertTriangle size={12} />
            {report.type || "Vulnerability"} — {report.severity || "N/A"}
          </span>
          {report.scan_status && (
            <span className="px-2.5 py-1 rounded border text-xs font-medium border-slate-600 text-gray-400">
              {report.scan_status}
            </span>
          )}
        </div>
      </div>

      {isVulnerabilitiesFormat && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Findings ({vulns.length})</h2>
          <div className="space-y-6">
            {vulns.map((v, idx) => (
              <div key={idx} className="bg-slate-900/60 border border-slate-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-semibold text-white">{v.type || "Vulnerability"}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    (v.severity || "").toUpperCase() === "HIGH" ? "bg-red-500/20 text-red-400" :
                    (v.severity || "").toUpperCase() === "MEDIUM" ? "bg-orange-500/20 text-orange-400" :
                    "bg-amber-500/20 text-amber-400"
                  }`}>{v.severity || "—"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div><span className="text-gray-500">URL</span><p className="text-gray-300 break-all font-mono">{v.url ?? "—"}</p></div>
                  <div><span className="text-gray-500">Method</span><p className="text-gray-300 font-mono">{v.method ?? "—"}</p></div>
                  <div><span className="text-gray-500">Parameter</span><p className="text-gray-300">{v.parameter ?? "—"}</p></div>
                  <div><span className="text-gray-500">DBMS</span><p className="text-gray-300">{v.dbms ?? "—"}</p></div>
                </div>
                {v.injection_techniques?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-gray-500 text-xs mb-1">Injection techniques</p>
                    <ul className="list-disc ml-4 text-gray-300 text-xs space-y-0.5">
                      {v.injection_techniques.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                  </div>
                )}
                {v.successful_payloads?.length > 0 && (
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Successful payloads</p>
                    <div className="space-y-1">
                      {v.successful_payloads.map((p, i) => (
                        <pre
                          key={i}
                          className="bg-slate-950 rounded p-2 text-gray-400 text-xs whitespace-pre-wrap break-all"
                        >
                          {p}
                        </pre>
                      ))}
                    </div>
                  </div>
                )}
                {v.evidence && (
                  <p className="text-xs text-gray-500 mt-2">
                    {v.evidence.sqlmap_confirmed && "SQLMap confirmed. "}
                    {v.evidence.sql_error_detected && "SQL error detected."}
                  </p>
                )}
              </div>
            ))}
          </div>
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
