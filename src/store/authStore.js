// src/store/authStore.js
import { create } from "zustand";
import { supabase } from "../services/supabase";

export const useAuthStore = create((set) => ({
  user:    null,
  profile: null,
  loading: true,

  initialize: async () => {
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
    await supabase.auth.signOut();
    set({ user: null, profile: null, loading: false });
  },

  setProfile: (profile) => set({ profile }),
}));