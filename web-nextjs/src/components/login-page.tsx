"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loadToken, saveToken } from "@/lib/chat-storage";

const gatewayBaseUrl =
  process.env.NEXT_PUBLIC_GATEWAY_BASE_URL ?? "http://localhost:5001";

export function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedToken = loadToken();
    if (storedToken) {
      router.replace("/");
      return;
    }

    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;

    if (!hash) {
      return;
    }

    const params = new URLSearchParams(hash);
    const accessToken = params.get("accessToken");

    if (params.get("oauth") === "success" && accessToken) {
      saveToken(accessToken);
      window.history.replaceState({}, document.title, "/login");
      router.replace("/");
      return;
    }
  }, [router]);

  const handleLogin = () => {
    setLoading(true);
    const returnUrl = `${window.location.origin}/login`;
    const loginUrl = `${gatewayBaseUrl}/api/auth/google/login?returnUrl=${encodeURIComponent(returnUrl)}`;
    window.location.href = loginUrl;
  };

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="login-brand">
          <span className="login-brand__badge">chat</span>
          <h1>Welcome to Distributed Chat</h1>
          <p>
            Login with Google, lalu langsung masuk ke panel chat tanpa urusan token
            manual.
          </p>
        </div>

        <div className="login-preview">
          <div className="login-preview__bubble login-preview__bubble--left">
            Halo, kita bikin UI yang lebih natural.
          </div>
          <div className="login-preview__bubble login-preview__bubble--right">
            Masuk dulu, terus langsung ngobrol.
          </div>
        </div>

        <button className="login-button" onClick={handleLogin} disabled={loading}>
          {loading ? "Checking session..." : "Continue with Google"}
        </button>
      </section>
    </main>
  );
}
