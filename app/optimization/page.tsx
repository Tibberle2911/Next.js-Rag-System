import { redirect } from 'next/navigation'

// Legacy /optimization route: permanently replaced by /scalability.
// Keep a minimal server component that redirects to the new page.
export default function Page() {
  redirect('/scalability')
  return null
}