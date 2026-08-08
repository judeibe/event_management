import { SiteHeader } from "@/components/site-header";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";

async function fetchEvents() {
  const data = await fetch('http://localhost:3000/events', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return data.json();
}

function formatEventDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + ' – ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}


export default async function EventPage() {
  const events = await fetchEvents();

  return (<>
    <SiteHeader title="Events" />
    <div>
      {events.data.map((event: any) => (
        <div key={event.id}>
          <div className="text-sm font-semibold tracking-wide text-indigo-500 uppercase">{formatEventDate(event.eventDate)}</div>
          <span className="mt-1 block text-lg leading-tight font-medium text-black hover:underline">
            {event.title}
          </span>
          <p className="mt-2 text-gray-500">
            {event.description}
          </p>
          <Progress value={event.currentRegistrations} max={event.maxCapacity} className="w-full max-w-sm">
            <ProgressValue />
          </Progress>
        </div>
      ))}
    </div>
  </>
  )
}