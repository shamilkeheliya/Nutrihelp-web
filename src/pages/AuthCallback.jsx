import { useContext, useEffect, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { supabase } from "../supabaseClient"
import { toast } from "react-toastify"
import { UserContext } from "../context/user.context"

export default function AuthCallback() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setCurrentUser } = useContext(UserContext)
  const handledRef = useRef(false) // prevents double execution

  useEffect(() => {
    if (handledRef.current) return
    handledRef.current = true

    const handleAuth = async () => {
      try {
        const params = new URLSearchParams(location.search)
        const mode = params.get("mode") // signup | login
        const next = params.get("next") || "/home"

        const { data, error } = await supabase.auth.getSession()

        // No session → go to login
        if (error || !data?.session) {
          navigate("/login", { replace: true })
          return
        }

        // ==========================
        // SIGNUP FLOW (SSO)
        // ==========================
        if (mode === "signup") {
          // Kill session so no auto-login happens
          await supabase.auth.signOut()

          toast.success(
            "Account registered successfully. Please login to continue.",
            { autoClose: 4000 }
          )

          navigate("/login", { replace: true })
          return
        }

        // ==========================
        // LOGIN FLOW (SSO)
        // ==========================
        if (mode === "login" || !mode) {
          const sessionUser = {
            id: data.session.user.id,
            uid: data.session.user.id,
            email: data.session.user.email,
            name:
              data.session.user.user_metadata?.full_name ||
              data.session.user.user_metadata?.name ||
              data.session.user.email,
            displayName:
              data.session.user.user_metadata?.full_name ||
              data.session.user.user_metadata?.name ||
              data.session.user.email,
            photoURL:
              data.session.user.user_metadata?.avatar_url ||
              data.session.user.user_metadata?.picture ||
              "",
            provider: data.session.user.app_metadata?.provider || "sso",
            supabaseAccessToken: data.session.access_token,
          }

          setCurrentUser(sessionUser, 60 * 60 * 1000)

          navigate(next, { replace: true })
          return
        }

        // ==========================
        // FALLBACK
        // ==========================
        navigate("/login", { replace: true })

      } catch (err) {
        console.error("Auth callback error:", err)
        navigate("/login", { replace: true })
      }
    }

    handleAuth()
  }, [location, navigate, setCurrentUser])

  return (
    <p style={{ padding: 16, fontSize: 14, color: "#555" }}>
      Completing authentication…
    </p>
  )
}
