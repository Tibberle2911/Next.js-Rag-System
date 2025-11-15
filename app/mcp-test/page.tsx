import { redirect } from 'next/navigation'

export default function MCPTestPage() {
  redirect('/operations')
  return null
}