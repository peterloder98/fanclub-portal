import { LiveHostRoom } from "@/components/live/live-host-room.client";

export const dynamic = "force-dynamic";

export default async function LiveHostPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const decoded = decodeURIComponent(token);

  return <LiveHostRoom token={decoded} />;
}
