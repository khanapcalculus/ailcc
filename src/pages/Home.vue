<template>
  <div class="home-container">
    <section class="hero">
      <div class="hero-content">
        <h1>Real-time Collaborative Whiteboard</h1>
        <p>
          A powerful online whiteboard designed for tutoring and teaching.
          Connect with your students in real-time and enhance their learning experience.
        </p>
        <div class="hero-buttons">
          <router-link to="/dashboard" v-if="isAuthenticated" class="btn btn-primary">Get Started</router-link>
          <router-link to="/login" v-else class="btn btn-primary">Sign In</router-link>
          <a href="#features" class="btn btn-outline">Learn More</a>
        </div>
      </div>
      <div class="hero-image">
        <img src="@/assets/whiteboard-preview.svg" alt="Whiteboard Preview" />
      </div>
    </section>

    <section id="features" class="features">
      <h2>Features</h2>
      <div class="features-grid">
        <div class="feature-card">
          <i class="fas fa-sync-alt"></i>
          <h3>Real-time Collaboration</h3>
          <p>Collaborate seamlessly with students in real-time using WebSockets technology.</p>
        </div>
        <div class="feature-card">
          <i class="fas fa-pencil-alt"></i>
          <h3>Drawing Tools</h3>
          <p>Use pen, eraser, shapes, and text tools to explain concepts effectively.</p>
        </div>
        <div class="feature-card">
          <i class="fas fa-undo"></i>
          <h3>Undo/Redo</h3>
          <p>Made a mistake? Easily undo and redo your actions.</p>
        </div>
        <div class="feature-card">
          <i class="fas fa-file-export"></i>
          <h3>Export Options</h3>
          <p>Save your whiteboard sessions as images or PDFs for later reference.</p>
        </div>
        <div class="feature-card">
          <i class="fas fa-mobile-alt"></i>
          <h3>Mobile Support</h3>
          <p>Access from any device with full support for tablets and stylus input.</p>
        </div>
        <div class="feature-card">
          <i class="fas fa-video"></i>
          <h3>Video Integration</h3>
          <p>Connect with your students using integrated camera and microphone.</p>
        </div>
      </div>
    </section>

    <section class="cta">
      <h2>Ready to transform your online teaching?</h2>
      <p>Create your account now and start using our collaborative whiteboard.</p>
      <router-link to="/login" class="btn btn-primary">Get Started Now</router-link>
    </section>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useAuthStore } from '@/store/auth'

export default {
  name: 'HomePage',
  setup() {
    const authStore = useAuthStore()
    const isAuthenticated = computed(() => authStore.isAuthenticated)

    return {
      isAuthenticated
    }
  }
}
</script>

<style scoped>
.home-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.hero {
  display: flex;
  align-items: center;
  gap: 4rem;
  margin: 3rem 0;
}

.hero-content {
  flex: 1;
}

.hero-content h1 {
  font-size: 2.5rem;
  color: var(--primary-color);
  margin-bottom: 1rem;
}

.hero-content p {
  font-size: 1.2rem;
  line-height: 1.6;
  color: var(--grey-color);
  margin-bottom: 2rem;
}

.hero-buttons {
  display: flex;
  gap: 1rem;
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

.btn-outline {
  border: 1px solid var(--primary-color);
  color: var(--primary-color);
  background-color: transparent;
}

.btn-outline:hover {
  background-color: rgba(67, 97, 238, 0.1);
}

.hero-image {
  flex: 1;
  max-width: 50%;
}

.hero-image img {
  width: 100%;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.features {
  margin: 6rem 0;
  text-align: center;
}

.features h2 {
  font-size: 2rem;
  color: var(--dark-color);
  margin-bottom: 3rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.feature-card {
  background-color: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-card i {
  font-size: 2.5rem;
  color: var(--primary-color);
  margin-bottom: 1rem;
}

.feature-card h3 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: var(--dark-color);
}

.feature-card p {
  color: var(--grey-color);
  line-height: 1.6;
}

.cta {
  background-color: var(--primary-color);
  color: white;
  padding: 4rem 2rem;
  text-align: center;
  border-radius: 8px;
  margin: 4rem 0;
}

.cta h2 {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.cta p {
  font-size: 1.2rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.cta .btn-primary {
  background-color: white;
  color: var(--primary-color);
}

.cta .btn-primary:hover {
  background-color: var(--light-color);
}

@media (max-width: 768px) {
  .hero {
    flex-direction: column;
    gap: 2rem;
  }
  
  .hero-image {
    max-width: 100%;
  }
  
  .hero-content h1 {
    font-size: 2rem;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .cta {
    padding: 3rem 1.5rem;
  }
}
</style> 