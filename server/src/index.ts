import cors from 'cors'
import express from 'express'
import { nanoid } from 'nanoid'
import PDFDocument from 'pdfkit'

type RequirementRecord = {
  requestId: string
  createdAt: number
  githubUrl: string
  requirements: string
  agentResults: Partial<Record<string, string>>
}

const store = new Map<string, RequirementRecord>()

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/requirements', (req, res) => {
  const githubUrl = String(req.body?.githubUrl ?? '').trim()
  const requirements = String(req.body?.requirements ?? '').trim()

  if (!githubUrl || !/github\.com/i.test(githubUrl)) {
    res.status(400).send('Invalid GitHub URL')
    return
  }

  const requestId = nanoid()
  store.set(requestId, {
    requestId,
    createdAt: Date.now(),
    githubUrl,
    requirements,
    agentResults: {},
  })

  res.json({ requestId })
})

const agentProfiles: Record<
  string,
  { minMs: number; maxMs: number; snippet: (r: RequirementRecord) => string }
> = {
  code: {
    minMs: 2_500,
    maxMs: 18_000,
    snippet: (r) =>
      `Repo referenced: ${new URL(r.githubUrl).pathname.replace(/^\/+/, '')}`,
  },
  scope: {
    minMs: 4_000,
    maxMs: 22_000,
    snippet: (r) =>
      r.requirements
        ? `Scope extracted from notes (preview): ${r.requirements.slice(0, 80)}…`
        : 'Scope projected from repository signals.',
  },
  cost: {
    minMs: 3_000,
    maxMs: 21_000,
    snippet: () => 'Initial cost levers identified: compute, storage, and network.',
  },
  workforce: {
    minMs: 3_500,
    maxMs: 19_000,
    snippet: () => 'Suggested migration plan aligned to likely team skill distribution.',
  },
}

app.post('/api/agents/:agentId', (req, res) => {
  const agentId = String(req.params.agentId ?? '')
  const requestId = String(req.body?.requestId ?? '')
  const record = store.get(requestId)

  if (!record) {
    res.status(404).send('Unknown requestId')
    return
  }

  const profile = agentProfiles[agentId]
  if (!profile) {
    res.status(404).send('Unknown agent')
    return
  }

  const delay =
    profile.minMs +
    Math.floor(Math.random() * Math.max(0, profile.maxMs - profile.minMs))

  const timer = setTimeout(() => {
    const resultSnippet = profile.snippet(record)
    record.agentResults[agentId] = resultSnippet
    res.json({ resultSnippet })
  }, delay)

  res.on('close', () => clearTimeout(timer))
})

app.post('/api/report/pdf', (req, res) => {
  const requestId = String(req.body?.requestId ?? '')
  const record = store.get(requestId)

  if (!record) {
    res.status(404).send('Unknown requestId')
    return
  }

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="cloud-compass-report.pdf"',
  )

  const doc = new PDFDocument({ size: 'A4', margin: 50 })
  doc.pipe(res)

  doc.fontSize(20).text('Cloud Compass Report', { underline: true })
  doc.moveDown()

  doc.fontSize(12).text(`Request ID: ${record.requestId}`)
  doc.text(`Generated: ${new Date().toISOString()}`)
  doc.moveDown()

  doc.fontSize(14).text('Inputs', { underline: true })
  doc.moveDown(0.5)
  doc.fontSize(12).text(`GitHub: ${record.githubUrl}`)
  doc.moveDown(0.5)
  doc.text(`Requirements:`)
  doc.fontSize(11).fillColor('#333333').text(record.requirements || '(none)')
  doc.fillColor('#000000')
  doc.moveDown()

  doc.fontSize(14).text('Agent summaries', { underline: true })
  doc.moveDown(0.5)

  const agentOrder = ['code', 'scope', 'cost', 'workforce']
  for (const id of agentOrder) {
    const snippet = record.agentResults[id]
    doc
      .fontSize(12)
      .text(`${id.toUpperCase()}:`, { continued: true })
      .fontSize(11)
      .text(` ${snippet ?? '(pending / timed out)'}`)
    doc.moveDown(0.25)
  }

  doc.moveDown()
  doc
    .fontSize(10)
    .fillColor('#666666')
    .text(
      'Note: This is a demo report generated from stubbed agent endpoints.',
    )
  doc.end()
})

app.post('/api/report/email', async (req, res) => {
  const requestId = String(req.body?.requestId ?? '')
  const email = String(req.body?.email ?? '').trim()
  const record = store.get(requestId)

  if (!record) {
    res.status(404).send('Unknown requestId')
    return
  }
  if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
    res.status(400).send('Invalid email')
    return
  }

  await new Promise((r) => setTimeout(r, 900))
  res.json({ ok: true })
})

const port = Number(process.env.PORT ?? 8787)
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Cloud Compass server listening on http://localhost:${port}`)
})

