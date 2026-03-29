<template>
  <q-page class="flex flex-center">
    <q-card style="width: 400px">
      <q-card-section>
        <div class="text-h6">Connexion</div>
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
        <q-btn label="Se connecter" color="primary" @click="handleLogin" />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script setup id="h2v6ji">
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