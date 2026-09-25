import { notFound } from "next/navigation";
import Link from "next/link";
import { User, Mail, Calendar, LogOut, ArrowLeft } from "lucide-react";
import Logo from "@/components/Logo";
import { getCurrentUser, signOut } from "@/lib/auth/middleware";

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    return notFound();
  }

  async function handleLogout() {
    "use server";
    await signOut();
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative z-10">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          {user.role === "admin" && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium transition-colors"
            >
              Admin Panel
            </Link>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">Account</h1>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 space-y-6">
            {/* User info */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <User className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {user.name || user.email.split("@")[0]}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Mail className="h-4 w-4" />
                  Email
                </span>
                <span className="text-sm text-slate-900 dark:text-white font-mono">{user.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Calendar className="h-4 w-4" />
                  Member since
                </span>
                <span className="text-sm text-slate-900 dark:text-white">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
              <form action={handleLogout}>
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 h-12 px-6 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
