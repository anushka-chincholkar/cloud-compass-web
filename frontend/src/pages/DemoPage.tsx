import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'

type DemoStatus = 'idle' | 'processing' | 'completed'
type AgentStatus = 'waiting' | 'running' | 'completed' | 'timed_out' | 'failed'

type AgentTile = {
  id: string
  title: string
  description: string
  status: AgentStatus
  resultSnippet?: string
}

const AGENTS_BASE: Omit<AgentTile, 'status' | 'resultSnippet'>[] = [
  {
    id: 'code',
    title: 'The Once and Future Code',
    description: 'Delving into the codebase',
  },
  {
    id: 'scope',
    title: 'Where did you come from, where will you go?',
    description: 'Projecting for future plans and scope to scale',
  },
  {
    id: 'cost',
    title: 'Money makes the world go around',
    description: 'Calculating and optimizing for cost',
  },
  {
    id: 'workforce',
    title: 'Busy bees in the hive',
    description: 'Configuring for the capabilities of your unique workforce',
  },
]

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error('timeout')), ms)
    promise
      .then((v) => {
        window.clearTimeout(t)
        resolve(v)
      })
      .catch((e) => {
        window.clearTimeout(t)
        reject(e)
      })
  })
}

async function postJson<T>(
  path: string,
  body: unknown,
  opts?: { signal?: AbortSignal },
): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: opts?.signal,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Request failed (${res.status})`)
  }
  return (await res.json()) as T
}

async function downloadPdf(path: string, body: unknown): Promise<void> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PDF request failed (${res.status})`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'cloud-compass-report.pdf'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function Spinner() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
  )
}

export function DemoPage() {
  const [status, setStatus] = useState<DemoStatus>('idle')
  const [githubUrl, setGithubUrl] = useState('')
  const [requirements, setRequirements] = useState('')
  const [requestId, setRequestId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState<
    'idle' | 'sending' | 'sent' | 'failed'
  >('idle')
  const [tiles, setTiles] = useState<AgentTile[]>(
    AGENTS_BASE.map((a) => ({ ...a, status: 'waiting' })),
  )

  const formUrl = import.meta.env.VITE_REQUIREMENTS_FORM_URL as string | undefined
  const hasValidGithub = useMemo(() => {
    const v = githubUrl.trim()
    return v.length > 0 && /github\.com/i.test(v)
  }, [githubUrl])

  const processingRef = useRef(false)

  const captureRequirements = useCallback(async () => {
    if (!hasValidGithub) return
    setEmailStatus('idle')

    const result = await postJson<{ requestId: string }>(
      '/api/requirements',
      {
        githubUrl: githubUrl.trim(),
        requirements: requirements.trim(),
      },
    )
    setRequestId(result.requestId)
    setStatus('processing')
  }, [githubUrl, hasValidGithub, requirements])

  useEffect(() => {
    const allDone = tiles.every((t) =>
      ['completed', 'timed_out', 'failed'].includes(t.status),
    )
    if (status === 'processing' && allDone) setStatus('completed')
  }, [status, tiles])

  useEffect(() => {
    if (status !== 'processing' || !requestId) return
    if (processingRef.current) return
    processingRef.current = true

    setTiles((prev) => prev.map((t) => ({ ...t, status: 'running' })))

    const run = async () => {
      await Promise.all(
        AGENTS_BASE.map(async (a) => {
          const controller = new AbortController()
          const timeout = window.setTimeout(() => controller.abort(), 20_000)

          try {
            const res = await withTimeout(
              postJson<{ resultSnippet: string }>(
                `/api/agents/${encodeURIComponent(a.id)}`,
                { requestId },
                { signal: controller.signal },
              ),
              20_000,
            )
            setTiles((prev) =>
              prev.map((t) =>
                t.id === a.id
                  ? {
                      ...t,
                      status: 'completed',
                      resultSnippet: res.resultSnippet,
                    }
                  : t,
              ),
            )
          } catch (e) {
            const isAbort =
              e instanceof DOMException ? e.name === 'AbortError' : false
            const isTimeout = e instanceof Error && e.message === 'timeout'
            setTiles((prev) =>
              prev.map((t) =>
                t.id === a.id
                  ? { ...t, status: isAbort || isTimeout ? 'timed_out' : 'failed' }
                  : t,
              ),
            )
          } finally {
            window.clearTimeout(timeout)
          }
        }),
      )
    }

    void run()
  }, [requestId, status])

  const downloadReport = useCallback(async () => {
    if (!requestId) return
    await downloadPdf('/api/report/pdf', { requestId })
  }, [requestId])

  const sendReport = useCallback(async () => {
    if (!requestId) return
    const to = email.trim()
    if (!to) return
    setEmailStatus('sending')
    try {
      await postJson<{ ok: true }>('/api/report/email', { requestId, email: to })
      setEmailStatus('sent')
    } catch {
      setEmailStatus('failed')
    }
  }, [email, requestId])

  return (
    <div className="bg-white">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm sm:p-8"
        >
          <div className="text-2xl font-semibold tracking-tight text-slate-900">
            What do you need?
          </div>
          <div className="mt-2 max-w-2xl text-sm text-slate-700">
            Link to your codebase for an easy experience or fill out the form
            below!
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="text-sm font-semibold text-slate-900">
                I know exactly what I need!
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Use the form below to capture goals, constraints, and context.
              </div>
              {formUrl ? (
                <a
                  href={formUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  Open full form
                </a>
              ) : (
                <div className="mt-3 text-xs text-slate-500">
                  Optional: set <code>VITE_REQUIREMENTS_FORM_URL</code> to show a
                  full form link.
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="text-sm font-semibold text-slate-900">
                I&apos;ll talk to someone to decide what I need
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Chat here to refine your needs before you submit requirements.
              </div>

              <div className="mt-4 grid h-56 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-600">
                <div>
                  CustomGPT embed slot
                  <div className="mt-1 text-xs text-slate-500">
                    (iframe/script can be placed here)
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-900">
              Quick requirements capture
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <label className="lg:col-span-2">
                <div className="text-xs font-medium text-slate-700">
                  What are you trying to achieve?
                </div>
                <textarea
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  rows={4}
                  placeholder="Describe your migration goals, constraints, timeline, and any critical services."
                  className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </label>

              <div className="grid content-start gap-4">
                <label>
                  <div className="text-xs font-medium text-slate-700">
                    GitHub project link <span className="text-red-600">*</span>
                  </div>
                  <input
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/org/repo"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  />
                  <div className="mt-2 text-xs text-slate-500">
                    Required so we can reference your repository during the demo.
                  </div>
                </label>

                <button
                  type="button"
                  onClick={() => void captureRequirements()}
                  disabled={!hasValidGithub || status === 'processing'}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {status === 'processing' ? 'Requirements captured' : 'Capture requirements'}
                </button>

                {!hasValidGithub && githubUrl.trim().length > 0 ? (
                  <div className="text-xs text-red-600">
                    Please enter a valid GitHub URL.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </motion.section>

        <section className="mt-10 sm:mt-12">
          <div className="text-xl font-semibold tracking-tight text-slate-900">
            What do we think?
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tiles.map((t, idx) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(0.15, idx * 0.04) }}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="text-sm font-semibold text-slate-900">
                  {t.title}
                </div>
                <div className="mt-1 text-sm text-slate-600">{t.description}</div>

                <div className="mt-4 flex items-center gap-2 text-sm">
                  {t.status === 'waiting' ? (
                    <span className="text-slate-500">Waiting for requirements</span>
                  ) : null}
                  {t.status === 'running' ? (
                    <>
                      <Spinner />
                      <span className="text-slate-700">Running…</span>
                    </>
                  ) : null}
                  {t.status === 'completed' ? (
                    <span className="font-medium text-emerald-700">Completed</span>
                  ) : null}
                  {t.status === 'timed_out' ? (
                    <span className="font-medium text-amber-700">Timed out (20s)</span>
                  ) : null}
                  {t.status === 'failed' ? (
                    <span className="font-medium text-red-700">Failed</span>
                  ) : null}
                </div>

                {t.resultSnippet ? (
                  <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    {t.resultSnippet}
                  </div>
                ) : null}
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mt-10 sm:mt-12">
          <div className="text-xl font-semibold tracking-tight text-slate-900">
            Your migration report
          </div>
          <div className="mt-2 max-w-3xl text-sm text-slate-700">
            Once agent processing finishes, download a PDF report or email it to
            your team.
          </div>

          <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="grid gap-4 lg:grid-cols-3 lg:items-end">
              <div className="lg:col-span-2">
                <div className="text-sm font-semibold text-slate-900">
                  Report status
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  {status === 'idle'
                    ? 'Capture requirements to begin.'
                    : status === 'processing'
                      ? 'Generating report… (tiles will complete or time out)'
                      : 'Ready.'}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                <button
                  type="button"
                  onClick={() => void downloadReport()}
                  disabled={status !== 'completed' || !requestId}
                  className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Download PDF Report
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3 sm:items-end">
              <label className="sm:col-span-2">
                <div className="text-xs font-medium text-slate-700">Send report to</div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </label>
              <button
                type="button"
                onClick={() => void sendReport()}
                disabled={status !== 'completed' || !requestId || !email.trim() || emailStatus === 'sending'}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                {emailStatus === 'sending' ? 'Sending…' : 'Email this report'}
              </button>
            </div>

            {emailStatus === 'sent' ? (
              <div className="mt-3 text-sm text-emerald-700">
                Report sent successfully.
              </div>
            ) : null}
            {emailStatus === 'failed' ? (
              <div className="mt-3 text-sm text-red-700">
                Could not send report. Please try again.
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  )
}

