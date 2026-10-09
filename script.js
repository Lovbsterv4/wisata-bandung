/* ==========================================================
   KONFIGURASI - ubah bagian ini sesuai bisnis Anda
   ========================================================== */
const CONFIG = {
  // Nomor WhatsApp tujuan, format internasional tanpa + atau 0 di depan
  nomorWA: '628888787000',
  namaBisnis: 'WisataBandung',
  // Pesan awal untuk tombol WhatsApp melayang
  pesanAwal: 'Halo WisataBandung! Saya mau tanya paket wisata.'
};

/* ---------- Helper ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const rupiah = (angka) => 'Rp ' + Number(angka).toLocaleString('id-ID');

function ringkasRupiah(angka) {
  if (angka >= 1000000) return 'Rp ' + (angka / 1000000).toString().replace('.', ',') + 'jt';
  return 'Rp ' + Math.round(angka / 1000) + 'rb';
}

function linkWA(teks) {
  return `https://wa.me/${CONFIG.nomorWA}?text=${encodeURIComponent(teks)}`;
}

/* ---------- Notifikasi ---------- */
let notifTimer;
function tampilkanNotif(pesan) {
  const notif = $('#notif');
  notif.textContent = pesan;
  notif.classList.add('show');
  clearTimeout(notifTimer);
  notifTimer = setTimeout(() => notif.classList.remove('show'), 3500);
}

/* ---------- Menu hamburger ---------- */
const menuToggle = $('#menuToggle');
const menuList = $('#menuList');

function tutupMenu() {
  menuList.classList.remove('open');
  menuToggle.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Buka menu');
}

menuToggle.addEventListener('click', () => {
  const terbuka = menuList.classList.toggle('open');
  menuToggle.classList.toggle('open', terbuka);
  menuToggle.setAttribute('aria-expanded', String(terbuka));
  menuToggle.setAttribute('aria-label', terbuka ? 'Tutup menu' : 'Buka menu');
});

$$('#menuList a').forEach((a) => a.addEventListener('click', tutupMenu));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') tutupMenu(); });

/* ---------- Harga paket & total otomatis ---------- */
$$('.harga[data-harga]').forEach((el) => {
  const h = Number(el.dataset.harga);
  el.innerHTML = `${ringkasRupiah(h)}<small>/orang</small>`;
});

const selectPaket = $('#paketPilihan');
const inputJumlah = $('#jumlah');
const totalEl = $('#totalHarga');

function hitungTotal() {
  const opsi = selectPaket.selectedOptions[0];
  const harga = Number(opsi && opsi.dataset.harga) || 0;
  const jumlah = Math.max(0, parseInt(inputJumlah.value, 10) || 0);
  totalEl.textContent = rupiah(harga * jumlah);
}
selectPaket.addEventListener('change', hitungTotal);
inputJumlah.addEventListener('input', hitungTotal);
hitungTotal();

/* ---------- Tombol "Pesan" di kartu paket -> isi form otomatis ---------- */
function pesanPaket(namaPaket) {
  selectPaket.value = namaPaket;
  hitungTotal();
  $('#pesan').scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => $('#nama').focus({ preventScroll: true }), 700);
}
$$('[data-paket]').forEach((btn) =>
  btn.addEventListener('click', () => pesanPaket(btn.dataset.paket))
);

/* ---------- Tanggal berangkat: minimal besok ---------- */
const inputTanggal = $('#tanggal');
(function setMinTanggal() {
  const besok = new Date();
  besok.setDate(besok.getDate() + 1);
  const yyyy = besok.getFullYear();
  const mm = String(besok.getMonth() + 1).padStart(2, '0');
  const dd = String(besok.getDate()).padStart(2, '0');
  inputTanggal.min = `${yyyy}-${mm}-${dd}`;
})();

/* ---------- Validasi & kirim form ke WhatsApp ---------- */
const form = $('#formPesan');

function setError(id, pesan) {
  const err = $('#err-' + id);
  const input = $('#' + (id === 'paket' ? 'paketPilihan' : id));
  err.textContent = pesan || '';
  input.classList.toggle('invalid', Boolean(pesan));
  return !pesan;
}

function nomorValid(nomor) {
  const bersih = nomor.replace(/[\s\-()]/g, '');
  return /^(\+62|62|0)8\d{7,12}$/.test(bersih);
}

function formatNomor(nomor) {
  let n = nomor.replace(/[\s\-()+]/g, '');
  if (n.startsWith('0')) n = '62' + n.slice(1);
  return n;
}

function formatTanggal(iso) {
  if (!iso) return '-';
  return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const nama = $('#nama').value.trim();
  const wa = $('#wa').value.trim();
  const paket = selectPaket.value;
  const jumlah = parseInt(inputJumlah.value, 10);
  const tanggal = inputTanggal.value;
  const catatan = $('#catatan').value.trim();

  const valid = [
    setError('nama', nama.length < 2 ? 'Isi nama lengkap kamu.' : ''),
    setError('wa', nomorValid(wa) ? '' : 'Masukkan nomor WhatsApp yang benar, contoh 08123456789.'),
    setError('paket', paket ? '' : 'Pilih salah satu paket.'),
    setError('jumlah', jumlah >= 1 ? '' : 'Jumlah peserta minimal 1 orang.')
  ].every(Boolean);

  if (!valid) {
    const pertama = $('.invalid', form);
    if (pertama) pertama.focus();
    return;
  }

  const harga = Number(selectPaket.selectedOptions[0].dataset.harga);
  const total = harga * jumlah;

  const pesan = [
    `Halo ${CONFIG.namaBisnis}! Saya ingin pesan:`,
    '',
    `Nama: ${nama}`,
    `WhatsApp: ${formatNomor(wa)}`,
    `Paket: ${paket}`,
    `Jumlah: ${jumlah} orang`,
    `Tanggal berangkat: ${formatTanggal(tanggal)}`,
    `Estimasi total: ${rupiah(total)}`,
    `Catatan: ${catatan || '-'}`
  ].join('\n');

  const jendela = window.open(linkWA(pesan), '_blank', 'noopener');
  if (!jendela) window.location.href = linkWA(pesan); // jika popup diblokir

  tampilkanNotif(`Terima kasih ${nama}! Lanjutkan pesanan ${paket} di WhatsApp.`);
  form.reset();
  inputJumlah.value = 2;
  hitungTotal();
});

// Hapus pesan error saat pengguna mulai mengetik
['nama', 'wa', 'jumlah'].forEach((id) =>
  $('#' + id).addEventListener('input', () => setError(id, ''))
);
selectPaket.addEventListener('change', () => setError('paket', ''));

/* ---------- Tombol WhatsApp melayang ---------- */
$('#waFloat').href = linkWA(CONFIG.pesanAwal);

/* ---------- Tombol kembali ke atas ---------- */
const toTop = $('#toTop');
toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ---------- Menu aktif saat scroll + tombol ke atas ---------- */
const sections = $$('main section[id]');
const navLinks = $$('#menuList a');

function updateScroll() {
  toTop.hidden = window.scrollY < 600;

  const posisi = window.scrollY + 120;
  let aktif = '';
  sections.forEach((s) => { if (posisi >= s.offsetTop) aktif = s.id; });
  navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + aktif));
}
window.addEventListener('scroll', updateScroll, { passive: true });
updateScroll();

/* ---------- Galeri lightbox ---------- */
const lightbox = $('#lightbox');
const lightboxImg = $('#lightboxImg');
let fokusSebelumnya = null;

function bukaLightbox(src, alt) {
  fokusSebelumnya = document.activeElement;
  lightboxImg.src = src;
  lightboxImg.alt = alt || '';
  lightbox.hidden = false;
  $('#lightboxClose').focus();
}
function tutupLightbox() {
  lightbox.hidden = true;
  lightboxImg.src = '';
  if (fokusSebelumnya) fokusSebelumnya.focus();
}

$$('.galeri-item').forEach((item) =>
  item.addEventListener('click', () => bukaLightbox(item.dataset.src, $('img', item).alt))
);
$('#lightboxClose').addEventListener('click', tutupLightbox);
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) tutupLightbox(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !lightbox.hidden) tutupLightbox();
});

/* ---------- Gambar gagal dimuat -> tampilkan latar hijau ---------- */
$$('img').forEach((img) => {
  img.addEventListener('error', () => {
    img.style.visibility = 'hidden';
    if (img.parentElement) img.parentElement.style.background = '#d9f5e6';
  });
});

/* ---------- Tahun footer otomatis ---------- */
$('#tahun').textContent = new Date().getFullYear();

/* ---------- Animasi muncul saat scroll ---------- */
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  $$('.card, .paket-card, .testi-card').forEach((el) => {
    el.classList.add('reveal');
    observer.observe(el);
  });
}
