"use client";

import { useEffect, useMemo, useState } from "react";

type Finding = {
  title: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  category: string;
  whyItMatters: string;
  evidence: string;
  recommendedFix: string;
};

type Analysis = {
  id: string;
  createdAt: string;
  contentType: string;
  riskScore: number;
  summary: string;
  findings: Finding[];
  sk?: string;
};

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

const DEMO_TERRAFORM = `resource "aws_security_group" "bad" {
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_s3_bucket" "b" {
  bucket = "my-test-bucket"
  acl    = "public-read"
}`;

const DEMO_IAM = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "*",
      "Resource": "*"
    }
  ]
}`;

function severityBadgeClass(sev: Finding["severity"]) {
  return sev === "CRITICAL"
    ? "bg-red-600/20 text-red-300 border-red-500/20"
    : sev === "HIGH"
    ? "bg-orange-600/20 text-orange-300 border-orange-500/20"
    : sev === "MEDIUM"
    ? "bg-yellow-600/20 text-yellow-200 border-yellow-500/20"
    : "bg-green-600/20 text-green-200 border-green-500/20";
}

function riskBarClass(score: number) {
  return score >= 75
    ? "bg-red-500"
    : score >= 50
    ? "bg-orange-400"
    : score >= 25
    ? "bg-yellow-400"
    : "bg-green-400";
}

export default function Home() {
  const [contentType, setContentType] = useState("terraform");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [history, setHistory] = useState<Analysis[]>([]);
  const [error, setError] = useState<string | null>(null);

  const canAnalyze = useMemo(() => content.trim().length > 0 && !loading, [content, loading]);

  async function loadHistory() {
    if (!API) return;
    const res = await fetch(`${API}history`);
    const data = await res.json();
    setHistory(data.items || []);
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function analyze() {
    setError(null);
    setLoading(true);
    setAnalysis(null);
    try {
      const res = await fetch(`${API}analyze`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content, contentType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setAnalysis(data);
      await loadHistory();
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function loadDemoTerraform() {
    setContentType("terraform");
    setContent(DEMO_TERRAFORM);
    setAnalysis(null);
    setError(null);
  }

  function loadDemoIam() {
    setContentType("code");
    setContent(DEMO_IAM);
    setAnalysis(null);
    setError(null);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">SecureFlow AI</h1>
          <p className="text-zinc-300">
            AI-powered DevSecOps assistant that shifts security left — fast, clear, actionable remediation.
          </p>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* LEFT */}
          <section className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-zinc-300">Input type</div>
                  <div className="text-xs text-zinc-400">Choose what you’re scanning</div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={loadDemoTerraform}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-900 transition"
                    type="button"
                  >
                    Load Demo: Terraform Risk
                  </button>
                  <button
                    onClick={loadDemoIam}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-900 transition"
                    type="button"
                  >
                    Load Demo: IAM Wildcard
                  </button>

                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value)}
                    className="w-48 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                  >
                    <option value="terraform">Terraform</option>
                    <option value="yaml">YAML</option>
                    <option value="dockerfile">Dockerfile</option>
                    <option value="code">Code Snippet</option>
                  </select>
                </div>
              </div>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste Terraform/YAML/code here…"
                className="mt-4 h-64 w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm outline-none"
              />

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={analyze}
                  disabled={!canAnalyze}
                  className={`rounded-xl px-4 py-2 text-sm font-medium text-white transition ${
                    canAnalyze
                      ? "bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90"
                      : "bg-zinc-700 cursor-not-allowed opacity-70"
                  }`}
                >
                  {loading ? "Analyzing…" : "Analyze"}
                </button>
                {error && <span className="text-sm text-red-400">{error}</span>}
              </div>
            </div>

            {analysis && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm text-zinc-400">Risk Score</div>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="text-4xl font-semibold">{analysis.riskScore}</div>
                      <div className="h-3 w-44 rounded-full bg-zinc-800">
                        <div
                          className={`h-3 rounded-full ${riskBarClass(analysis.riskScore)}`}
                          style={{ width: `${analysis.riskScore}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-zinc-400">Scanned</div>
                    <div className="text-sm">{new Date(analysis.createdAt).toLocaleString()}</div>
                  </div>
                </div>

                <p className="mt-4 text-zinc-200">{analysis.summary}</p>

                <div className="mt-6 space-y-4">
                  {analysis.findings.map((f, i) => (
                    <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="font-medium">{f.title}</div>

                        <div
                          className={`text-xs px-3 py-1 rounded-full font-medium border ${severityBadgeClass(
                            f.severity
                          )}`}
                        >
                          {f.severity} • {f.category}
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-zinc-300">
                        <div className="font-medium text-zinc-200">Why it matters</div>
                        <div>{f.whyItMatters}</div>
                      </div>

                      <div className="mt-3 text-sm text-zinc-300">
                        <div className="font-medium text-zinc-200">Evidence</div>
                        <pre className="mt-1 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-xs">
                          {f.evidence}
                        </pre>
                      </div>

                      <div className="mt-3 text-sm text-zinc-300">
                        <div className="font-medium text-zinc-200">Recommended fix</div>
                        <div>{f.recommendedFix}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* RIGHT */}
          <aside className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-zinc-300">History</div>
                <div className="text-xs text-zinc-400">Last 10 analyses</div>
              </div>

              <button
                onClick={loadHistory}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-900 transition"
              >
                Refresh
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {history.map((h) => (
                <div key={h.sk || h.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">{h.contentType}</div>
                    <div className="text-xs text-zinc-400">{h.riskScore}</div>
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">{new Date(h.createdAt).toLocaleString()}</div>
                </div>
              ))}
              {!history.length && <div className="text-sm text-zinc-400">No scans yet.</div>}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
