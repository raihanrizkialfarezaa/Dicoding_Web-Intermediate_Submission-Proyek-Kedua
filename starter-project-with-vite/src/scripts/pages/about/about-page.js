export default class AboutPage {
  async render() {
    return `
      <section class="about-section">
        <div class="container">
          <article class="about-content">
            <h1>Tentang Dicoding Stories</h1>
            
            <div class="about-description">
              <p>
                Dicoding Stories adalah platform sharing pengalaman dan inspirasi 
                bagi para student Dicoding di seluruh Indonesia. Melalui aplikasi ini, 
                kita dapat membagikan momen belajar, achievement, dan cerita menarik seputar aktivitas kita 
                kepada komunitas.
              </p>

              <h2>Fitur Utama</h2>
              <ul class="features-list">
                <li>
                  <strong>Berbagi Cerita</strong> - Upload foto dan ceritakan pengalaman belajar Kalian
                </li>
                <li>
                  <strong>Peta Interaktif</strong> - Lihat lokasi cerita dari seluruh student di Indonesia
                </li>
                <li>
                  <strong>Akses Kamera</strong> - Ambil foto langsung dari kamera Kalian
                </li>
              </ul>

              <h2>Teknologi & Peningkatan yang Telah Diterapkan</h2>
              <ul class="tech-list">
                <li>Single Page Application (SPA) dengan pola arsitektur MVP dan dukungan View Transition API</li>
                <li>Leaflet.js untuk peta interaktif (multiple tile layers, marker, popup)</li>
                <li>Progressive Web App (PWA): <strong>service worker</strong> + <strong>manifest</strong> + offline page (dengan app shell)</li>
                <li>Push Notification (Web Push) menggunakan VAPID public key bawaan api Dicoding, termasuk tombol enable/disable dan action pada notification</li>
                <li>IndexedDB untuk penyimpanan lokal (cache stories, draft/penyimpanan offline) dan mekanisme sinkronisasi saat online</li>
                <li>Fitur offline: menyimpan draft saat offline dan otomatis <em>sync</em> ketika kembali terhubung ke internet</li>
                <li>Guest posting: dapat mengirim cerita tanpa login melalui endpoint khusus, lalu disimpan di cache lokal agar langsung tampil di daftar cerita</li>
                <li>Media Stream API untuk opsi mengambil foto dari kamera, dengan handling upload dan preview</li>
                <li>Accessible UI: link "skip to content", semantic HTML, label form, keyboard operability, dan focus styles</li>
                <li>Deployment (Netlify) <code>STUDENT.txt</code> telah saya isi dengan URL hasil deploy</li>
              </ul>

              <h3>Catatan teknis singkat</h3>
              <p class="muted">Implementasi ini memanfaatkan service worker untuk caching (app shell dengan runtime caching untuk API), IndexedDB untuk data offline, serta modul presenter untuk memisahkan logic presentasi. Guest story yang dikirim tanpa otentikasi akan disimpan secara lokal (termasuk image upload sebagai data URL), sehingga bisa langsung muncul pada daftar cerita meskipun API mewajibkan otentikasi untuk fetch data semua cerita.</p>

              
            </div>
          </article>
        </div>
      </section>
    `;
  }

  async afterRender() {}
}
