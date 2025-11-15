import { redirect } from 'next/navigation'

// Legacy /advanced-features route: replaced by consolidated /operations & /scalability pages.
// Minimal server component to redirect users seamlessly.
export default function Page() {
  redirect('/operations')
  return null
}