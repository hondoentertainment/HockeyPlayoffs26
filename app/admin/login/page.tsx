import { loginAction } from "../actions";

export default function AdminLoginPage({
  searchParams
}: {
  searchParams: { error?: string };
}) {
  return (
    <section className="max-w-sm">
      <h1 className="text-2xl font-bold mb-4">Admin login</h1>
      {searchParams.error && (
        <p className="mb-3 text-sm text-red-600">Wrong password.</p>
      )}
      <form action={loginAction} className="space-y-3">
        <input
          type="password"
          name="password"
          required
          autoFocus
          className="block w-full rounded border border-slate-300 px-3 py-2"
          placeholder="Admin password"
        />
        <button
          type="submit"
          className="rounded bg-playoff px-4 py-2 text-white font-semibold hover:opacity-90"
        >
          Sign in
        </button>
      </form>
    </section>
  );
}
