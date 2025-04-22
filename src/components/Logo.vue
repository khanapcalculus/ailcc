<template>
  <div class="logo-component">
    <img src="@/assets/logo.svg" alt="LCC Whiteboard" class="logo-img" />
    <span v-if="showText" class="logo-text">LCC Whiteboard</span>
  </div>
</template>

<script>
export default {
  name: 'LogoComponent',
  props: {
    showText: {
      type: Boolean,
      default: true
    }
  }
}
</script>

<style scoped>
.logo-component {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logo-img {
  height: 40px;
  width: 40px;
}

.logo-text {
  font-size: 1.25rem;
  font-weight: bold;
  color: var(--primary-color, #4361EE);
}
</style> 