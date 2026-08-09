import { SiteHeader } from "@/components/site-header"
import { MyRegistrationsList } from "@/components/dashboard/my-registrations-list"

export default function MyRegistrationsPage() {
  return (
    <>
      <SiteHeader title="My Registrations" />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 lg:p-6">
        <MyRegistrationsList />
      </div>
    </>
  )
}
