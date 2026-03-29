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
    },

    logout() {
      this.token = null;
      localStorage.removeItem("token");
    },
  },
});