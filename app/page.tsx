import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect to sign-in page since this is a tenant-based CRM
  redirect('/signin')
}
