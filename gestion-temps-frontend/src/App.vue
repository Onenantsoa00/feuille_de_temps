<template>
  <router-view v-slot="{ Component }">
    <transition name="route-fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<script setup>
//
</script>

<style scoped>
.route-fade-enter-active {
  transition:
    opacity 0.38s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.38s cubic-bezier(0.22, 1, 0.36, 1);
}

.route-fade-leave-active {
  transition:
    opacity 0.28s cubic-bezier(0.4, 0, 1, 1),
    transform 0.28s cubic-bezier(0.4, 0, 1, 1);
}

.route-fade-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.995);
}

.route-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
