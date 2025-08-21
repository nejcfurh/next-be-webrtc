export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold mb-4">KVS WebRTC Backend</h1>
        <p className="text-gray-600 mb-8">
          Server-side signing for AWS Kinesis Video Streams WebRTC
        </p>

        <div className="bg-gray-100 rounded-lg p-6 text-left">
          <h2 className="text-xl font-semibold mb-4 text-black">
            API Endpoints:
          </h2>
          <ul className="space-y-2">
            <li>
              <code className="bg-gray-200 px-2 py-1 rounded text-black">
                POST /api/kvs/initialize
              </code>
              <p className="text-sm text-gray-600 mt-1">
                Initialize KVS connection with signed URLs
              </p>
            </li>
            <li>
              <code className="bg-gray-200 px-2 py-1 rounded text-black">
                POST /api/kvs/sign-url
              </code>
              <p className="text-sm text-gray-600 mt-1">
                Sign a URL for KVS WebRTC
              </p>
            </li>
            <li>
              <code className="bg-gray-200 px-2 py-1 rounded text-black">
                GET /api/health
              </code>
              <p className="text-sm text-gray-600 mt-1">
                Health check endpoint
              </p>
            </li>
          </ul>
        </div>

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-black">
          <p className="text-sm">
            <strong>Note:</strong> Make sure to configure your AWS credentials
            in <code>.env.local</code>
          </p>
        </div>
      </div>
    </main>
  );
}
