export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const errorMessages: Record<string, string> = {
    no_code: "Authorization code was not provided",
    auth_failed: "Authentication failed. Please try again.",
    unauthorized: "Please sign in to continue",
    access_denied: "You denied access to your Google Calendar",
  };

  const params = await searchParams;
  const error = params.error;
  const errorMessage = error ? errorMessages[error] || "An error occurred" : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">
          CalPal AI
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Your Smart Calendar Assistant
        </p>

        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errorMessage}
          </div>
        )}

        <a
          href="/api/auth/google"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
        >
          Sign in with Google
        </a>

        <div className="mt-8 text-sm text-gray-600">
          <p>📅 Manage your calendar with AI</p>
          <p>👥 Schedule time with friends</p>
          <p>🔒 Your data is encrypted and secure</p>
        </div>
      </div>
    </div>
  );
}
