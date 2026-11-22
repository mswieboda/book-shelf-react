import express from 'express'

const app = express()

app.get('/healthz', (_req, res) => {
  res.json({ ok: true })
})

const port = Number(process.env.PORT ?? 4000)
app.listen(port, () => {
  console.log(`shelf-api listening on http://localhost:${port}`)
})
