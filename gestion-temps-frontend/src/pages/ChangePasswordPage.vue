<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md gt-page-title">Modifier mon mot de passe</div>
    <q-card class="gt-card" style="max-width: 560px">
      <q-card-section class="q-gutter-md">
        <q-input
          v-model="currentPassword"
          label="Mot de passe actuel"
          :type="showCurrent ? 'text' : 'password'"
          outlined
        >
          <template #append>
            <q-icon
              :name="showCurrent ? 'visibility_off' : 'visibility'"
              class="cursor-pointer"
              @click="showCurrent = !showCurrent"
            />
          </template>
        </q-input>
        <q-input
          v-model="newPassword"
          label="Nouveau mot de passe"
          :type="showNew ? 'text' : 'password'"
          outlined
        >
          <template #append>
            <q-icon
              :name="showNew ? 'visibility_off' : 'visibility'"
              class="cursor-pointer"
              @click="showNew = !showNew"
            />
          </template>
        </q-input>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn color="primary" unelevated label="Mettre à jour" @click="submit" />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { Notify } from 'quasar'
import { api } from 'src/boot/axios'
import { notifyApiError } from 'src/utils/apiError'

const currentPassword = ref('')
const newPassword = ref('')
const showCurrent = ref(false)
const showNew = ref(false)

const submit = async () => {
  if (!currentPassword.value || !newPassword.value) {
    Notify.create({ type: 'warning', message: 'Remplissez tous les champs' })
    return
  }
  if (newPassword.value.length < 6) {
    Notify.create({
      type: 'warning',
      message: 'Le nouveau mot de passe doit contenir au moins 6 caractères.',
    })
    return
  }
  try {
    await api.put('/users/change-password', {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    })
    currentPassword.value = ''
    newPassword.value = ''
    Notify.create({ type: 'positive', message: 'Mot de passe modifié' })
  } catch (e) {
    notifyApiError(e, 'Impossible de changer le mot de passe.')
  }
}
</script>
