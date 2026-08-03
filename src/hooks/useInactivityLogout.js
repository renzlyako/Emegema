import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "../store/authStore";

const TIMEOUT_BY_ROLE = {
  admin:   15 * 60 * 1000, // 15 minutes
  teacher: 30 * 60 * 1000, // 30 minutes
  student: 30 * 60 * 1000, // 30 minutes
};

const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart"];

export function useInactivityLogout() {
  const { user, profile, signOut } = useAuthStore();
  const timerRef = useRef(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!user) return;

    const timeoutMs = TIMEOUT_BY_ROLE[profile?.role] ?? TIMEOUT_BY_ROLE.student;

    timerRef.current = setTimeout(async () => {
      await signOut();
      window.location.href = "/login?reason=inactivity";
    }, timeoutMs);
  }, [user, profile?.role, signOut]);

  useEffect(() => {
    if (!user) return;

    resetTimer();
    ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, resetTimer));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, resetTimer));
    };
  }, [user, resetTimer]);
}