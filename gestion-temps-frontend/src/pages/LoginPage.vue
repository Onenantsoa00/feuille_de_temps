<template>
  <q-page class="flex flex-center gt-soft-surface">
    <q-card class="login-card gt-card gt-fade-scale">
      <q-card-section>
        <div class="text-h6 text-weight-bold">Connexion</div>
        <div class="text-caption text-grey-7">Accédez à votre espace de suivi.</div>
      </q-card-section>

      <q-card-section>
        <div class="row justify-center q-mb-md">
          <q-img
            src="/logo_etika_sans_background.png"
            fit="contain"
            style="width: 130px; height: 130px"
          />
        </div>
        <q-input v-model="email" label="Email" outlined />
        <q-input
          v-model="password"
          label="Mot de passe"
          :type="showPassword ? 'text' : 'password'"
          outlined
          class="q-mt-md"
        >
          <template #append>
            <q-icon
              :name="showPassword ? 'visibility_off' : 'visibility'"
              class="cursor-pointer"
              @click="showPassword = !showPassword"
            />
          </template>
        </q-input>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          label="Se connecter"
          color="primary"
          unelevated
          class="login-btn"
          @click="handleLogin"
        />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Notify } from 'quasar'
import { useAuthStore } from 'src/stores/auth'
import { extractApiErrorMessage } from 'src/utils/apiError'

const email = ref('')
const password = ref('')
const showPassword = ref(false)

const router = useRouter()
const authStore = useAuthStore()

const handleLogin = async () => {
  if (!email.value?.trim()) {
    Notify.create({ type: 'warning', message: 'Email requis' })
    return
  }
  if (!password.value) {
    Notify.create({ type: 'warning', message: 'Mot de passe requis' })
    return
  }

  try {
    await authStore.login(email.value, password.value)
    router.push('/dashboard')
  } catch (error) {
    console.error(error)
    Notify.create({
      type: 'negative',
      message: extractApiErrorMessage(
        error,
        'Impossible de se connecter. Vérifiez vos identifiants.',
      ),
    })
  }
}
</script>

<style scoped>
.login-card {
  width: 420px;
  max-width: calc(100vw - 32px);
}

.login-btn {
  border-radius: 12px;
  padding: 8px 20px;
  transition:
    transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.3s ease;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.18);
}
</style>
