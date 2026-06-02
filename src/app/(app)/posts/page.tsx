import { Topbar } from "@/components/app-shell/topbar";
import { PostFeed } from "@/components/feed/post-feed";

export default function PostsPage() {
  return (
    <div className="min-h-screen">
      <Topbar title="News & Grüße" subtitle="Posten, lesen, kommentieren." />
      <main className="px-4 py-6 lg:px-8">
        <PostFeed />
      </main>
    </div>
  );
}

