export default function AdminAccountingLoading() {
  return (
    <div className="min-h-screen animate-pulse">
      <div className="h-16 border-b bg-slate-100" />
      <div className="space-y-4 px-4 py-6 lg:px-8">
        <div className="h-4 w-32 rounded bg-slate-200" />
        <div className="flex gap-2">
          <div className="h-10 w-28 rounded-xl bg-slate-200" />
          <div className="h-10 w-28 rounded-xl bg-slate-200" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="h-24 rounded-2xl bg-slate-100" />
          <div className="h-24 rounded-2xl bg-slate-100" />
          <div className="h-24 rounded-2xl bg-slate-100" />
        </div>
        <div className="h-96 rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
}
