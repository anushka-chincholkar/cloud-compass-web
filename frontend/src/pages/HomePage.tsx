import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const features = [
  {
    title: 'Capture requirements',
    description:
      'Gather your goals and constraints through a simple guided flow.',
  },
  {
    title: 'Agent-powered analysis',
    description:
      'We simulate key agent workflows to reason about your migration approach.',
  },
  {
    title: 'Generate a report',
    description:
      'Summarize recommendations into a shareable PDF you can circulate quickly.',
  },
  {
    title: 'Email stakeholders',
    description:
      'Send the report to your team with a single action once it’s ready.',
  },
]

export function HomePage() {
  return (
    <div className="bg-white">
      <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <section className="grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-balance text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl"
            >
              Migrating cloud providers now easier than ever!
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-4 max-w-2xl text-pretty text-lg text-slate-700"
            >
              We craft a cloud architecture plan suited to your codebase, scaling
              plans and workforce capabilities.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Link
                to="/demo"
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Explore with a Demo
              </Link>
              <div className="text-sm text-slate-600">
                Cloud Compass • Your AI-powered cloud consultant
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm"
            >
              <div className="text-sm font-semibold text-slate-900">
                What Cloud Compass can do
              </div>
              <div className="mt-2 text-sm text-slate-600">
                Quick preview of the demo workflow you’ll run end-to-end.
              </div>
              <div className="mt-6 grid gap-3">
                {features.slice(0, 3).map((f) => (
                  <div
                    key={f.title}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="text-sm font-semibold text-slate-900">
                      {f.title}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {f.description}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="mt-14 sm:mt-18">
          <div className="text-sm font-semibold text-slate-900">
            Key features
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, idx) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.45, delay: Math.min(0.2, idx * 0.05) }}
                className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="text-sm font-semibold text-slate-900">
                  {f.title}
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  {f.description}
                </div>
                <div className="mt-4 h-px bg-slate-100" />
                <div className="mt-3 text-xs font-medium text-slate-500">
                  Placeholder copy (you said you’ll change later)
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

