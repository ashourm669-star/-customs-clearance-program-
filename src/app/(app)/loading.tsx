export default function AppLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="skeleton h-6 w-48" />
          <div className="skeleton h-3 w-72" />
        </div>
        <div className="skeleton h-10 w-32 rounded-xl" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card p-5">
            <div className="flex items-start justify-between">
              <div className="w-full space-y-2">
                <div className="skeleton h-2.5 w-24" />
                <div className="skeleton h-6 w-32" />
              </div>
              <div className="skeleton size-11 rounded-xl" />
            </div>
            <div className="skeleton mt-3 h-2.5 w-20" />
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="border-b border-slate-100 p-5">
            <div className="skeleton h-4 w-40" />
          </div>
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 px-5 py-4">
                <div className="skeleton size-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-1/3" />
                  <div className="skeleton h-2.5 w-1/2" />
                </div>
                <div className="skeleton h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <div className="skeleton mx-auto size-36 rounded-full" />
          <div className="mt-5 space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="skeleton h-3 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
