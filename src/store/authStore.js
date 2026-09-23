// src/store/authStore.js
import { create } from "zustand";
import { supabase } from "../services/supabase";

let manualSignOut = false;
let authListenerAttached = false; // bagong guard — pigil sa duplicate listener

export const useAuthStore = create((set, get) => ({
  user:          null,
  profile:       null,
  loading:       true,
  isRecovering:  false,
  sessionExpired: false,

  initialize: async () => {

    if (!authListenerAttached) {
      authListenerAttached = true;

      supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          set({ isRecovering: true });
        }

        if (event === "SIGNED_OUT") {
          const wasLoggedIn = !!get().user;
          if (wasLoggedIn && !manualSignOut) {
            set({ user: null, profile: null, sessionExpired: true });
          }
          manualSignOut = false;
        }
      });
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        
        if (profile?.status === "suspended") {
          await supabase.auth.signOut();
          set({ user: null, profile: null, loading: false });
          return;
        }

        try {
          await supabase
            .from("profiles")
            .update({ last_active_at: new Date().toISOString() })
            .eq("id", session.user.id);
        } catch (_) {}

        set({ user: session.user, profile, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (err) {
      console.error(err);
      set({ loading: false });
    }
  },

  signIn: async (email, password, captchaToken) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    });

    if (error) return { error, role: null };

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profile?.status === "suspended") {
      await supabase.auth.signOut();
      set({ user: null, profile: null, loading: false });
      return {
        error: { message: "Your account has been suspended. Please contact your administrator." },
        role: null,
      };
    }

    try {
      await supabase
        .from("profiles")
        .update({ last_active_at: new Date().toISOString() })
        .eq("id", data.user.id);
    } catch (_) {}

    set({ user: data.user, profile, loading: false });
    return { error: null, role: profile?.role ?? "student" };
  },

  signOut: async () => {
    manualSignOut = true;
    await supabase.auth.signOut();
    set({ user: null, profile: null, loading: false });
  },

  dismissSessionExpired: () => set({ sessionExpired: false }),

  setProfile: (profile) => set({ profile }),
}));