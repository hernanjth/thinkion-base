export default function LoginLoading() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center gap-6 animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-gray-200" />
          <div className="space-y-2 w-full flex flex-col items-center">
            <div className="h-5 w-40 bg-gray-200 rounded" />
            <div className="h-4 w-56 bg-gray-100 rounded" />
          </div>
          <div className="w-full h-10 bg-gray-100 rounded-lg border border-gray-200" />
        </div>
      </div>
    </main>
  );
}
