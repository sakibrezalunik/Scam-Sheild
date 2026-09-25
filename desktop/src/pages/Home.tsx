/**
 * ScamShield Desktop — Home Page
 */
import { LinkIcon, MessageSquare, Briefcase, ArrowRight } from "lucide-react";
import { useNavigate } from "../hooks/useNavigate";
import { useAuth } from "../store/auth";
import Logo from "../components/Logo";

export default function HomePage() {
  const { navigate } = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="text-center space-y-4 py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-950 mb-2">
          <Logo iconOnly className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Detect Scams Before They Detect You
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-lg mx-auto text-lg">
          AI-powered analysis for URLs, messages, and job offers. Protect yourself from phishing, fraud, and employment scams.
        </p>
        {!isAuthenticated && (
          <button
            onClick={() => navigate({ kind: "login" })}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Scanner types */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            key: "url" as const,
            icon: LinkIcon,
            title: "URL Scanner",
            desc: "Check any link for phishing, malware, or fraudulent domains.",
            color: "blue",
          },
          {
            key: "message" as const,
            icon: MessageSquare,
            title: "Message Scanner",
            desc: "Analyze texts, emails, and social messages for scam patterns.",
            color: "purple",
          },
          {
            key: "job" as const,
            icon: Briefcase,
            title: "Job Offer Scanner",
            desc: "Verify job postings and offers to avoid employment fraud.",
            color: "emerald",
          },
        ].map((item) => {
          const Icon = item.icon;
          const colorMap: Record<string, string> = {
            blue: "from-blue-500 to-blue-600",
            purple: "from-purple-500 to-purple-600",
            emerald: "from-emerald-500 to-emerald-600",
          };
          return (
            <button
              key={item.key}
              onClick={() => navigate({ kind: "scan", type: item.key })}
              className="text-left p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all bg-white dark:bg-gray-800"
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorMap[item.color]} flex items-center justify-center mb-4`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{item.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
              <div className="mt-4 text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                Analyze now <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Features */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { step: "1", title: "Paste Your Input", desc: "URL, message text, or job posting" },
            { step: "2", title: "AI Analysis", desc: "ScamShield runs our risk engine + AI" },
            { step: "3", title: "Get Results", desc: "Clear risk score, indicators, and recommendations" },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                {item.step}
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">{item.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
