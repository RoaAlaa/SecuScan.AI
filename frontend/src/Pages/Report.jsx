import { useEffect, useState } from "react";
import Navbar from "../Components/NavBar/Navbar";

export default function Report() {
  const [report, setReport] = useState(null);

  useEffect(() => {
    fetch("http://localhost:3000/api/report")
      .then(res => res.json())
      .then(data => setReport(data))
      .catch(err => console.error(err));
  }, []);

  if (!report) {
    return (
      <>
        <Navbar />
        <p className="text-center mt-24 text-gray-400">Loading report...</p>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <div className="pt-24 pb-16 px-6 max-w-5xl mx-auto">

        {/* HEADER */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">
            Security Vulnerability Report
          </h1>
          <p className="text-gray-400 text-sm">
            Detailed findings and remediation guidance
          </p>
        </div>

        <div className="bg-red-900/20 border border-red-500/40 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-red-400 mb-2">
            {report.type}
          </h2>
          <p className="text-sm text-gray-300">
            Severity: <span className="text-red-300">{report.severity}</span>
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-6 mb-8">
          <h3 className="font-semibold mb-4 text-gray-200">Scan Information</h3>

          <p className="text-sm"><span className="text-gray-400">Scan ID:</span> {report.scan_info?.scan_id}</p>
          <p className="text-sm"><span className="text-gray-400">Date:</span> {report.scan_info?.scan_date}</p>
          <p className="text-sm"><span className="text-gray-400">Scanner:</span> {report.scan_info?.scanner}</p>
          <p className="text-sm"><span className="text-gray-400">Target IP:</span> {report.scan_info?.target_ip}</p>
          <p className="text-sm"><span className="text-gray-400">Duration:</span> {report.scan_info?.scan_duration}</p>
          <p className="text-sm"><span className="text-gray-400">Status:</span> {report.scan_info?.status}</p>
        </div>

   
        <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-6 mb-8">
          <h3 className="font-semibold mb-4 text-gray-200">
            Vulnerable Request
          </h3>

          <p className="text-sm break-all">
            <span className="text-gray-400">URL:</span> {report.request?.url}
          </p>
          <p className="text-sm">
            <span className="text-gray-400">Method:</span> {report.request?.method}
          </p>

          <div className="mt-4">
            <p className="text-gray-400 text-sm mb-1">Payload Data</p>
            <div className="bg-slate-950 rounded-lg p-3 text-xs break-all">
              {report.request?.data}
            </div>
          </div>
        </div>

 
        <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-6 mb-8">
          <h3 className="font-semibold mb-4 text-gray-200">
            Evidence & Findings
          </h3>

          <p className="text-sm">
            <span className="text-gray-400">Parameter:</span>{" "}
            {report.evidence?.vulnerable_parameter}
          </p>

          <p className="text-sm">
            <span className="text-gray-400">DBMS:</span>{" "}
            {report.evidence?.dbms}
          </p>

          <div className="mt-4">
            <p className="text-gray-400 mb-1 text-sm">Injection Techniques</p>
            <ul className="list-disc ml-6 text-sm text-gray-300">
              {report.evidence?.injection_techniques?.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>

          <div className="mt-5">
            <p className="text-gray-400 mb-2 text-sm">Successful Payloads</p>

            {report.evidence?.successful_payloads?.map((p, i) => (
              <div
                key={i}
                className="bg-slate-950 rounded-lg p-3 text-xs break-all mb-2"
              >
                {p}
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-500 mt-3">
            {report.evidence?.proof}
          </p>
        </div>


        <div className="bg-purple-900/20 border border-purple-500/40 rounded-xl p-6 mb-8">
          <h3 className="font-semibold text-purple-300 mb-2">
            Risk Analysis
          </h3>

          <p className="text-sm">CVSS Score: {report.risk_analysis?.cvss_score}</p>
          <p className="text-sm">Vector: {report.risk_analysis?.cvss_vector}</p>
          <p className="text-sm">Likelihood: {report.risk_analysis?.likelihood}</p>
          <p className="text-sm">Impact Level: {report.risk_analysis?.impact_level}</p>
        </div>


        <div className="bg-orange-900/20 border border-orange-500/40 rounded-xl p-6 mb-8">
          <h3 className="font-semibold text-orange-300 mb-2">Impact</h3>

          <ul className="list-disc ml-6 text-sm text-gray-300 space-y-1">
            {report.impact?.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>


        <div className="bg-yellow-900/20 border border-yellow-500/40 rounded-xl p-6 mb-8">
          <h3 className="font-semibold text-yellow-300 mb-2">
            Affected Components
          </h3>

          <ul className="list-disc ml-6 text-sm text-gray-300">
            {report.affected_components?.map((comp, i) => (
              <li key={i}>{comp}</li>
            ))}
          </ul>
        </div>


        <div className="bg-green-900/20 border border-green-500/40 rounded-xl p-6 mb-8">
          <h3 className="font-semibold text-green-300 mb-3">
            Recommended Fixes
          </h3>

          <ul className="list-disc ml-6 text-sm text-gray-300 space-y-1">
            {report.recommendations?.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>

        <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-6">
          <h3 className="font-semibold text-gray-200 mb-3">
            References
          </h3>

          {report.references?.map((ref, i) => (
            <a
              key={i}
              href={ref.url}
              target="_blank"
              rel="noreferrer"
              className="block text-blue-400 text-sm underline mb-1"
            >
              {ref.title}
            </a>
          ))}
        </div>

      </div>
    </>
  );
}
