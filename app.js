// =========================================================================
// 1. IMPORT & INISIALISASI FIREBASE (COMPAT)
// =========================================================================
import "https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js";
import "https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCTr4i_AuiODEKOFWs8esIC-JTzMTQJAg0",
    authDomain: "care-plus-4f248.firebaseapp.com",
    projectId: "care-plus-4f248",
    storageBucket: "care-plus-4f248.firebasestorage.app",
    messagingSenderId: "67403429166",
    appId: "1:67403429166:web:12a8b2734f6fe31be976bf"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// =========================================================================
// 2. VARIABEL GLOBAL & PENGATURAN UMUM
// =========================================================================
const WHATSAPP_NUMBER = "6281120082818"; // Nomor WA Admin CarePlus

// Menangkap elemen-elemen penting dari HTML
const productGrid = document.getElementById("product-grid");
const loadingState = document.getElementById("loading-state");
const searchInput = document.getElementById("search-input");
const catalogSection = document.getElementById("catalog-section");
const detailSection = document.getElementById("detail-section");

// Array penampung seluruh data produk dari Firebase untuk fitur pencarian lokal
let allProductsData = []; 

// Fungsi pembantu untuk memformat angka menjadi format Rupiah (Rp)
const formatRupiah = (value) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
};

// =========================================================================
// 3. MESIN FIREBASE (Menarik & Memantau Data Secara Real-Time)
// =========================================================================
db.collection("products")
  .where("is_published", "==", true)
  .onSnapshot((snapshot) => {
    
    // Kosongkan array setiap kali ada perubahan/update dari database
    allProductsData = []; 

    snapshot.forEach((doc) => {
        // Masukkan ID dokumen ke dalam object data lalu simpan di array
        allProductsData.push({ id: doc.id, ...doc.data() });
    });

    // Setelah data terkumpul, lempar ke mesin render untuk digambar di layar
    renderKatalog(allProductsData);

  }, (error) => {
      console.error("Gagal memuat katalog dari Firebase: ", error);
      loadingState.innerHTML = `<p class="text-red-500 font-medium">Gagal memuat data. Periksa koneksi internet atau pengaturan Firebase.</p>`;
  });

// =========================================================================
// 4. MESIN RENDER KATALOG (Menggambar Kartu Produk ke Layar)
// =========================================================================
function renderKatalog(dataArray) {
    productGrid.innerHTML = ""; // Bersihkan area grid sebelum diisi

    // Jika data kosong (tidak ada produk tayang atau hasil pencarian nihil)
    if (dataArray.length === 0) {
        productGrid.innerHTML = `
            <div class="col-span-full text-center py-10 text-gray-500">
                <i class="fa-solid fa-box-open text-4xl mb-2 text-gray-300"></i>
                <p>Belum ada produk trade-in yang tayang, atau produk tidak ditemukan.</p>
            </div>
        `;
        loadingState.classList.add("hidden");
        productGrid.classList.remove("hidden");
        return;
    }

    // Melakukan perulangan untuk setiap produk yang ada di dalam array
    dataArray.forEach((data) => {
        // --- Ekstraksi Data ---
        const id = data.id;
        const name = data.type_name || "Produk Tanpa Nama"; 
        const basePrice = data.base_price || 0;
        const stock = data.stock || 0;
        const discountPercent = data.discount_percent || 0;
        
        const imageUrls = data.image_urls || [];
        const firstImage = imageUrls.length > 0 ? imageUrls[0] : "https://via.placeholder.com/300?text=No+Image";

        // --- Logika Kalkulasi Diskon ---
        let finalPrice = basePrice;
        let discountBadgeHTML = "";
        let originalPriceHTML = "";

        if (discountPercent > 0) {
            const discountAmount = (basePrice * discountPercent) / 100;
            finalPrice = basePrice - discountAmount;
            
            discountBadgeHTML = `<span class="absolute top-2 left-2 bg-red-600 text-white font-extrabold text-xs px-2 py-1 rounded shadow-md z-10 animate-bounce">-${discountPercent}%</span>`;
            originalPriceHTML = `<span class="text-xs text-gray-400 line-through mr-1">${formatRupiah(basePrice)}</span>`;
        }

        // --- Logika Pesan WhatsApp ---
        const rawMessage = `Halo Admin, saya tertarik untuk membeli produk trade-in berikut:\n\n📦 *Nama Produk:* ${name}\n💰 *Harga:* ${formatRupiah(finalPrice)}\n🆔 *ID Produk:* ${id}\n\nApakah unit ini masih tersedia?`;
        const encodedMessage = encodeURIComponent(rawMessage);
        const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;

        // --- Pembuatan Kartu HTML (Card) ---
        const productCard = document.createElement("div");
        productCard.className = "bg-white rounded-xl shadow-sm hover:shadow-xl border border-gray-100 overflow-hidden flex flex-col justify-between transition-all duration-300 transform hover:-translate-y-1 relative group";
        
        // Bagian A: Area Informasi Produk (Jika diklik akan membuka detail)
        const clickableArea = document.createElement("div");
        clickableArea.className = "cursor-pointer flex-1";
        clickableArea.innerHTML = `
            <div class="relative pt-[100%] bg-gray-100 overflow-hidden">
                ${discountBadgeHTML}
                <img src="${firstImage}" alt="${name}" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
            </div>
            <div class="p-3 md:p-4">
                <p class="text-xs font-semibold text-gray-400 uppercase tracking-tight mb-1">Stok: ${stock}</p>
                <h3 class="text-sm md:text-base font-bold text-gray-800 line-clamp-2 min-h-[2.5rem] md:min-h-[3rem] group-hover:text-red-600 transition-colors">${name}</h3>
                <div class="mt-2 flex flex-wrap items-baseline">
                    ${originalPriceHTML}
                    <span class="text-base md:text-lg font-black text-red-600">${formatRupiah(finalPrice)}</span>
                </div>
            </div>
        `;

        clickableArea.addEventListener("click", () => {
            bukaHalamanDetail(data, id, firstImage, basePrice, finalPrice, discountPercent, whatsappUrl);
        });

        // Bagian B: Area Tombol Beli Cepat (Langsung ke WA)
        const actionArea = document.createElement("div");
        actionArea.className = "p-3 pt-0";
        actionArea.innerHTML = `
            <a href="${whatsappUrl}" target="_blank" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs md:text-sm shadow-md hover:shadow-lg flex items-center justify-center space-x-2 transition duration-300">
                <i class="fa-brands fa-whatsapp text-base"></i>
                <span>Beli Langsung</span>
            </a>
        `;

        // Susun kartu dan masukkan ke dalam grid
        productCard.appendChild(clickableArea);
        productCard.appendChild(actionArea);
        productGrid.appendChild(productCard);
    });

    // Hilangkan efek loading, munculkan grid
    loadingState.classList.add("hidden");
    productGrid.classList.remove("hidden");
}

// =========================================================================
// 5. MESIN PENCARIAN (LIVE SEARCH)
// =========================================================================
searchInput.addEventListener("input", (e) => {
    // Ambil teks yang diketik user lalu ubah jadi huruf kecil semua
    const keyword = e.target.value.toLowerCase();
    
    // Saring array allProductsData berdasarkan nama produk (type_name)
    const filteredData = allProductsData.filter(produk => {
        const namaProduk = (produk.type_name || "").toLowerCase();
        return namaProduk.includes(keyword);
    });

    // Tampilkan ulang katalog hanya dengan data yang sudah disaring
    renderKatalog(filteredData);
});

// =========================================================================
// 6. MESIN PENGENDALI HALAMAN DETAIL
// =========================================================================
function bukaHalamanDetail(data, id, imageUrl, basePrice, finalPrice, discountPercent, waUrl) {
    // Scroll mulus ke atas
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Sembunyikan Area Katalog, Munculkan Area Detail
    catalogSection.classList.add("hidden");
    detailSection.classList.remove("hidden");

    // Suntikkan data ke elemen-elemen detail di HTML
    document.getElementById("detail-image").src = imageUrl;
    document.getElementById("detail-title").innerText = data.type_name || "Produk Tanpa Nama";
    document.getElementById("detail-stock").innerText = `Sisa Stok: ${data.stock || 0} Unit`;
    document.getElementById("detail-final-price").innerText = formatRupiah(finalPrice);
    document.getElementById("detail-wa-btn").href = waUrl;

    // Menarik Spesifikasi dari field "specs" (Sesuai database Care Plus)
    const deskripsi = data.specs || `Produk hasil Trade-In berkualitas.\nSemua fungsi telah melewati Quality Control (QC) ketat oleh tim Care Plus.`;
    document.getElementById("detail-desc").innerText = deskripsi;

    // Atur tampilan harga coret dan badge diskon di dalam halaman detail
    const elOriginalPrice = document.getElementById("detail-original-price");
    const elBadge = document.getElementById("detail-badge");

    if (discountPercent > 0) {
        elOriginalPrice.innerText = formatRupiah(basePrice);
        elOriginalPrice.classList.remove("hidden");
        elBadge.innerText = `Hemat ${discountPercent}%`;
        elBadge.classList.remove("hidden");
    } else {
        elOriginalPrice.classList.add("hidden");
        elBadge.classList.add("hidden");
    }
}

// Tombol Kembali ke Katalog
document.getElementById("btn-back-catalog").addEventListener("click", () => {
    // Sembunyikan Area Detail, Munculkan kembali Area Katalog
    detailSection.classList.add("hidden");
    catalogSection.classList.remove("hidden");
    
    // Scroll mulus ke atas
    window.scrollTo({ top: 0, behavior: 'smooth' });
});