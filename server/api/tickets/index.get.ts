export default defineEventHandler(async () => {
  const db = await readDb()
  return db.tickets
})
