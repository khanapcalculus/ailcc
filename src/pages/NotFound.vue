<template>
  <div class="not-found-container">
    <div class="not-found-content">
      <div class="not-found-icon">
        <i class="fas fa-exclamation-triangle"></i>
      </div>
      <h1>404</h1>
      <h2>Page Not Found</h2>
      <p>The page you are looking for doesn't exist or has been moved.</p>
      <router-link to="/" class="btn btn-primary">Go Home</router-link>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NotFound'
}
</script>

<style scoped>
.not-found-container {
  width: 100%;
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.not-found-content {
  max-width: 500px;
  text-align: center;
}

.not-found-icon {
  font-size: 4rem;
  color: var(--warning-color);
  margin-bottom: 1rem;
}

h1 {
  font-size: 6rem;
  color: var(--primary-color);
  margin: 0;
  line-height: 1;
}

h2 {
  font-size: 2rem;
  margin-bottom: 1rem;
  color: var(--dark-color);
}

p {
  color: var(--grey-color);
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: var(--border-radius);
  font-weight: 500;
  text-decoration: none;
  transition: all 0.3s ease;
  cursor: pointer;
  display: inline-block;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
  border: none;
}

.btn-primary:hover {
  background-color: var(--secondary-color);
}
</style> 