import { defineStore } from "pinia";
import { api } from "src/boot/axios";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem("token") || null,
  }),

  actions: {
    async login(email, password) {
      const response = await api.post("/login", {
        email,
        password,
      });

      this.token = response.data.token;
      localStorage.setItem("token", this.token);

      // Stocke l'utilisateur pour la logique offline (ex: user_id en local)
      if (response.data.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }
    },

    logout() {
      this.token = null;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
  },
});