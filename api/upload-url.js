export default async function handler(req, res) {
  res.status(410).json({ error: 'upload temporarily disabled' })
}
