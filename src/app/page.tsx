"use client";

import { useEffect, useState } from "react";
import InfoModal from "@/components/InfoModal";

type Doc = { id: number; title: string; chunkCount: number };
type Source = { documentTitle: string; similarity: number; excerpt: string };
type Claim = { claim: string; status: "supported" | "partial" | "unsupported"; reason: string };
type Answer = { answer: string; sources: Source[]; claims?: Claim[] };

const CLAIM_STYLE: Record<Claim["status"], { icon: string; color: string; label: string }> = {
  supported: { icon: "✓", color: "#16a34a", label: "Supported" },
  partial: { icon: "~", color: "#ca8a04", label: "Partially supported" },
  unsupported: { icon: "✕", color: "#dc2626", label: "Not supported" },
};

export default function Home() {
  const [showInfo, setShowInfo] = useState(false);
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [title, setTitle] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState<Answer | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  async function loadDocs() {
    const res = await fetch("/api/documents");
    const data = await res.json();
    setDocs(data.documents ?? []);
  }

  useEffect(() => {
    loadDocs();
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setUploadError(null);
    if (!title.trim()) {
      setUploadError("Give the document a title.");
      return;
    }
    if (!file && !pastedText.trim()) {
      setUploadError("Upload a PDF or paste some text.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.set("title", title);
      if (file) form.set("file", file);
      else form.set("text", pastedText);

      const res = await fetch("/api/ingest", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Upload failed.");
        return;
      }
      setTitle("");
      setPastedText("");
      setFile(null);
      await loadDocs();
    } finally {
      setUploading(false);
    }
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    setAskError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAskError(data.error ?? "Something went wrong.");
        return;
      }
      setResult(data);
    } finally {
      setAsking(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-8">
      <header className="text-center flex flex-col items-center gap-1.5 relative">
        <button
          onClick={() => setShowInfo(true)}
          aria-label="How FinWise works"
          title="How FinWise works"
          className="absolute top-0 right-0 w-8 h-8 rounded-full grid place-items-center font-bold"
          style={{ background: "var(--accent-soft)", color: "var(--accent-dark)", border: "1px solid var(--border)" }}
        >
          ⓘ
        </button>
        <h1 className="text-3xl font-bold" style={{ color: "var(--accent)" }}>
          FinWise
        </h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Upload financial aid and scholarship documents, then ask questions answered only from what you uploaded.
        </p>
      </header>

      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}

      <section className="card p-5">
        <h2 className="font-semibold mb-3">1. Add a document</h2>
        <form onSubmit={handleUpload} className="flex flex-col gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title, e.g. 'FAFSA eligibility rules'"
            className="border rounded-lg px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)" }}
          />
          <input
            type="file"
            accept=".pdf,.txt"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <p className="text-xs text-center" style={{ color: "var(--muted)" }}>
            or paste text instead
          </p>
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste document text here..."
            rows={4}
            className="border rounded-lg px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)" }}
          />
          {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
          <button
            type="submit"
            disabled={uploading}
            className="rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--accent)" }}
          >
            {uploading ? "Processing (chunking + embedding)..." : "Add document"}
          </button>
        </form>

        {docs && docs.length > 0 && (
          <div className="mt-4 pt-4 flex flex-col gap-1.5" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
              Uploaded documents
            </p>
            {docs.map((d) => (
              <p key={d.id} className="text-sm">
                {d.title} <span style={{ color: "var(--muted)" }}>({d.chunkCount} chunks)</span>
              </p>
            ))}
          </div>
        )}
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">2. Ask a question</h2>
        <form onSubmit={handleAsk} className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Do I lose my scholarship if I drop to part-time?"
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)" }}
          />
          <button
            type="submit"
            disabled={asking}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--accent)" }}
          >
            {asking ? "Thinking..." : "Ask"}
          </button>
        </form>

        {askError && <p className="text-sm text-red-600 mt-3">{askError}</p>}

        {result && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="p-4 rounded-lg text-sm whitespace-pre-line" style={{ background: "var(--accent-soft)" }}>
              {result.answer}
            </div>

            {result.claims && result.claims.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
                  Fact-check: each claim in the answer above, verified against the retrieved chunks (not just
                  re-asked to confirm itself)
                </p>
                {result.claims.map((c, i) => {
                  const style = CLAIM_STYLE[c.status];
                  return (
                    <div key={i} className="text-xs p-3 rounded-lg card">
                      <div className="flex items-start gap-2">
                        <span className="font-bold shrink-0" style={{ color: style.color }}>
                          {style.icon}
                        </span>
                        <div>
                          <p className="font-medium">{c.claim}</p>
                          <p className="mt-0.5" style={{ color: style.color }}>
                            {style.label}
                            {c.reason && <span style={{ color: "var(--muted)" }}>: {c.reason}</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {result.sources.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
                  Retrieved chunks (this is what was actually handed to the model, ranked by similarity)
                </p>
                {result.sources.map((s, i) => (
                  <div key={i} className="text-xs p-3 rounded-lg" style={{ background: "var(--accent-soft)" }}>
                    <div className="flex justify-between font-semibold mb-1">
                      <span>{s.documentTitle}</span>
                      <span style={{ color: "var(--accent)" }}>similarity {s.similarity}</span>
                    </div>
                    <p style={{ color: "var(--muted)" }}>{s.excerpt}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
