<template>
  <q-page class="flex flex-center gt-soft-surface">
    <q-card class="login-card gt-card gt-fade-scale">
      <q-card-section>
        <div class="text-h6 text-weight-bold">Connexion</div>
        <div class="text-caption text-grey-7">
          Accédez à votre espace de suivi.
        </div>
        <div class="text-caption text-grey-6 q-mt-sm">
          Compte administrateur par défaut (après migration SQL + 1er démarrage du serveur) :
          <strong>admin@admin.local</strong> — mot de passe
          <strong>Admin123!</strong> ou variable <code>DEFAULT_ADMIN_PASSWORD</code>.
        </div>
      </q-card-section>

      <q-card-section>
        <q-input v-model="email" label="Email" outlined />
        <q-input
          v-model="password"
          label="Mot de passe"
          type="password"
          outlined
          class="q-mt-md"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn label="Se connecter" color="primary" unelevated class="login-btn" @click="handleLogin" />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "src/stores/auth";

const email = ref("");
const password = ref("");

const router = useRouter();
const authStore = useAuthStore();

const handleLogin = async () => {
  try {
    await authStore.login(email.value, password.value);
    router.push("/dashboard");
  } catch (error) {
    console.error(error);
    alert("Erreur login");
  }
};
</script>

<style scoped>
.login-card {
  width: 420px;
  max-width: calc(100vw - 32px);
}

.login-btn {
  border-radius: 12px;
  padding: 8px 20px;
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.18);
}
</style>