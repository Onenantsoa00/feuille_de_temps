import { defineStore } from "pinia";
import { api } from "src/boot/axios";

function parseStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem("token") || null,
    user: parseStoredUser(),
  }),

  getters: {
    isAdmin: (state) => state.user?.role === "admin",
    isSecretaire: (state) => state.user?.role === "secretaire",
    role: (state) => state.user?.role ?? null,
    canManageCompanies: (state) =>
      ["admin", "secretaire"].includes(state.user?.role),
    canManageUsers: (state) =>
      ["admin", "secretaire"].includes(state.user?.role),
    canCreateMission: (state) =>
      ["admin", "secretaire", "chef_mission"].includes(state.user?.role),
    canSendAdminNotifications: (state) =>
      ["admin", "secretaire"].includes(state.user?.role),
  },

  actions: {
    async login(email, password) {
      try {
        const response = await api.post("/login", {
          email,
          password,
        });

        this.token = response.data.token;
        localStorage.setItem("token", this.token);

        if (response.data.user) {
          this.user = response.data.user;
          localStorage.setItem("user", JSON.stringify(this.user));
        }
      } catch (error) {
        console.error("LOGIN ERROR:", error.response || error.message);
        throw error;
      }
    },

    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
  },
});