"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, Settings2, TicketIcon } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

// No auth/authz gating (matches apps/api's current no-auth scope, spec FR-016) — both the
// attendee-facing and admin nav groups are reachable to anyone with the URL.
const attendeeNavItems = [
  { title: "Events", url: "/events", icon: CalendarDays },
  { title: "My Registrations", url: "/my-registrations", icon: TicketIcon },
]

const adminNavItems = [{ title: "Manage Events", url: "/admin/events", icon: Settings2 }]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Attendee</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {attendeeNavItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    isActive={pathname === item.url}
                    render={
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    }
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    isActive={pathname?.startsWith(item.url)}
                    render={
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    }
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  )
}
