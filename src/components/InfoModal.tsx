"use client";

export default function InfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      style={{ background: "rgba(15, 34, 71, 0.55)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card w-full max-w-lg max-h-[88vh] overflow-hidden flex flex-col"
      >
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--accent-soft)" }}
        >
          <span className="font-bold" style={{ color: "var(--accent-dark)" }}>
            How FinWise works
          </span>
          <button onClick={onClose} className="text-lg" style={{ color: "var(--muted)" }} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="px-5 py-5 overflow-y-auto flex flex-col gap-5 text-sm">
          <section>
            <h3 className="font-semibold mb-1.5" style={{ color: "var(--accent-dark)" }}>
              What it does
            </h3>
            <p style={{ color: "var(--muted)" }}>
              Upload financial aid, scholarship, or student loan documents (a PDF or pasted text), then ask
              plain-English questions. Answers come only from what you uploaded, not general internet knowledge, so
              it won&apos;t make something up about your specific school or scholarship.
            </p>
          </section>

          <section>
            <h3 className="font-semibold mb-1.5" style={{ color: "var(--accent-dark)" }}>
              How to use it
            </h3>
            <ol className="list-decimal pl-5 flex flex-col gap-1" style={{ color: "var(--muted)" }}>
              <li>Add a document with a short title (upload a PDF, or paste text directly).</li>
              <li>Ask a question in the box below, the way you&apos;d ask a person.</li>
              <li>
                Read the answer, then check the &quot;Retrieved chunks&quot; section underneath it, which shows
                exactly which passages from your document were used and how relevant each one was.
              </li>
            </ol>
          </section>

          <section>
            <h3 className="font-semibold mb-1.5" style={{ color: "var(--accent-dark)" }}>
              How it works, briefly
            </h3>
            <p style={{ color: "var(--muted)" }}>
              Each document is split into overlapping passages, and each passage is converted into a numeric
              &quot;fingerprint&quot; that captures its meaning using an embedding model. Your question gets the same
              treatment, and the system finds whichever passages have the closest-matching fingerprint. Only those
              passages, not the whole document, get handed to the AI model to write an answer from, with instructions
              to say &quot;I don&apos;t know&quot; rather than guess if they&apos;re not enough.
            </p>
          </section>

          <section>
            <h3 className="font-semibold mb-1.5" style={{ color: "var(--accent-dark)" }}>
              Why this is different from a typical &quot;chat with your PDF&quot; tool
            </h3>
            <ul className="list-disc pl-5 flex flex-col gap-1" style={{ color: "var(--muted)" }}>
              <li>
                <strong>Sources are always visible.</strong> Most tools hide retrieval behind a chat bubble. FinWise
                shows the actual passages and similarity scores so you can check the answer yourself.
              </li>
              <li>
                <strong>It&apos;s allowed to say &quot;I don&apos;t know.&quot;</strong> Many RAG demos let the model
                guess when it can&apos;t find a real answer. This one is explicitly instructed not to.
              </li>
              <li>
                <strong>Real search infrastructure</strong> (Postgres with a proper vector index), not a toy
                in-memory lookup that stops working past a handful of documents.
              </li>
              <li>
                <strong>Built for a domain where a wrong answer costs real money</strong>, which is also why a
                fact-checking layer (verifying each claim in an answer against the source text) is the planned next
                step, not an afterthought.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
