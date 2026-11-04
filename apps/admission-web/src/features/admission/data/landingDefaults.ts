import type { LandingContent } from '../types/landing'

export const landingDefaults: LandingContent = {
  hero: {
    eyebrow: 'Penerimaan Santri Baru · MTs Persis 241 Al-Ikhlash',
    titleLines: ['Di sini, cerita', 'barumu dimulai.'],
    description:
      'Kenali lingkungan belajarmu, siapkan langkah berikutnya. Pendaftaran santri baru MTs Persis 241 Al-Ikhlash dimulai dari sini.',
    registerLabel: 'Mulai pendaftaran',
    guideLabel: 'Lihat cara mendaftar',
    exploreLabel: 'Mengenal MTs Persis 241 Al-Ikhlash lebih dekat',
    photoNoteLines: ['Awal langkah.', 'Banyak cerita.'],
    schoolPhoto: {
      image: { src: '/hero/baiat.webp' },
      alt: "Santri berbaris khidmat dalam upacara bai'at di MTs Persis 241 Al-Ikhlash",
      caption: "Bai'at santri, upacara rutin di MTs Persis 241 Al-Ikhlash",
    },
    studyPhoto: {
      image: { src: '/hero/tahfidz.webp' },
      alt: "Santri menghafal Al-Qur'an bersama pembimbing",
      title: "Tahfidz Al-Qur'an",
      tag: 'Program unggulan',
    },
  },
  life: {
    label: 'Mengenal MTs Persis 241 Al-Ikhlash',
    titleLines: ['Ada cerita', 'di setiap sudutnya.'],
    description:
      'Sebelum menjadi bagian dari MTs Persis 241 Al-Ikhlash, lihat lebih dekat suasana yang akan menjadi bagian dari cerita sekolahmu.',
    footnote: 'Setiap perjalanan dimulai dengan mengenal.',
    linkLabel: 'Lihat jadwal pendaftaran',
    photos: [
      {
        image: { src: '/hero/baiat.webp' },
        alt: "Santri berbaris khidmat dalam upacara bai'at",
        title: "Bai'at Santri",
        caption:
          'Upacara rutin tempat santri berikrar dan menumbuhkan kedisiplinan.',
      },
      {
        image: { src: '/hero/tahfidz.webp' },
        alt: "Santri menghafal Al-Qur'an bersama pembimbing",
        title: "Tahfidz Al-Qur'an",
        caption:
          "Program unggulan madrasah untuk mencetak generasi penghafal Al-Qur'an.",
      },
      {
        image: { src: '/hero/mabit-rg.webp' },
        alt: 'Santri mengikuti mabit Rijaalul Ghad',
        title: 'Mabit Rijaalul Ghad',
        caption:
          'Program pembentukan iman, takwa, dan karakter santri melalui bina malam.',
      },
      {
        image: { src: '/hero/mabit-ug.webp' },
        alt: 'Santri mengikuti mabit Ummahatul Ghad',
        title: 'Mabit Ummahatul Ghad',
        caption:
          'Program pembentukan iman, takwa, dan karakter santri melalui bina malam.',
      },
      {
        image: { src: '/hero/rapat-orangtua.webp' },
        alt: 'Orang tua santri menghadiri pertemuan di madrasah',
        title: 'Rapat Orang Tua',
        caption: 'Madrasah dan orang tua berjalan bersama.',
      },
      {
        image: { src: '/hero/inhouse-training.webp' },
        alt: 'Guru mengikuti in-house training',
        title: 'In-House Training Guru',
        caption: 'Guru terus belajar demi mutu pendidikan yang lebih baik.',
      },
      {
        image: { src: '/hero/rapat-evaluasi.webp' },
        alt: 'Guru dan staf dalam rapat evaluasi',
        title: 'Rapat Evaluasi',
        caption: 'Evaluasi bersama agar pembelajaran terus membaik.',
      },
    ],
  },
  info: {
    title: 'Informasi PPDB',
    description: 'Poster dan informasi terbaru seputar penerimaan santri baru.',
    posters: [],
  },
  steps: {
    title: 'Tahapan pendaftaran',
    description:
      'Lima langkah dari membuat akun sampai pengumuman hasil, semuanya bisa diselesaikan dari rumah.',
    items: [
      {
        title: 'Buat akun',
        description:
          'Daftar dengan email aktif, lalu masuk untuk memulai pendaftaran.',
      },
      {
        title: 'Isi formulir',
        description:
          'Lengkapi data diri, orang tua atau wali, alamat, sekolah asal, dan prestasi. Bisa dilanjutkan kapan saja sebelum dikirim.',
      },
      {
        title: 'Unggah berkas',
        description:
          'Foto atau pindai dokumen persyaratan, lalu unggah dari akunmu.',
      },
      {
        title: 'Bayar biaya pendaftaran',
        description:
          'Unggah bukti pembayaran. Kursimu terjamin setelah panitia mengonfirmasinya.',
      },
      {
        title: 'Kirim dan pantau',
        description:
          'Kirim pendaftaran, lalu pantau status dan pengumuman. Jika ada yang perlu diperbaiki, panitia akan memberi catatan.',
      },
    ],
  },
  faq: {
    title: 'Pertanyaan seputar pendaftaran',
    description:
      'Jawaban singkat untuk hal yang sering ditanyakan calon santri dan orang tua.',
    items: [
      {
        question: 'Bagaimana cara memulai pendaftaran?',
        answer:
          'Pilih Mulai pendaftaran, lalu masuk dengan akunmu. Belum punya akun? Daftar dulu dengan email aktif.',
      },
      {
        question: 'Apakah formulir bisa diisi sedikit demi sedikit?',
        answer:
          'Bisa. Isi sebisanya, simpan, dan lanjutkan kapan saja dari akunmu. Pendaftaran baru diproses setelah kamu menekan kirim.',
      },
      {
        question: 'Berkas apa yang harus disiapkan?',
        answer:
          'Daftar lengkapnya ada di bagian Persyaratan di atas. Siapkan dalam bentuk JPG, PNG, atau PDF dengan ukuran di bawah 5 MB per berkas.',
      },
      {
        question: 'Bagaimana cara membayar biaya pendaftaran?',
        answer:
          'Transfer ke salah satu rekening yang tampil di langkah Pembayaran pada akunmu, lalu unggah bukti transfernya. Panitia akan memeriksanya.',
      },
      {
        question: 'Kapan kursiku dipastikan aman?',
        answer:
          'Setelah panitia mengonfirmasi pembayaranmu. Kursi setiap gelombang terbatas, jadi sebaiknya bayar lebih awal.',
      },
      {
        question: 'Bisakah data diubah setelah dikirim?',
        answer:
          'Data terkunci setelah dikirim. Kamu bisa mengubahnya lagi hanya jika panitia meminta perbaikan.',
      },
      {
        question: 'Bagaimana kalau ada berkas yang perlu diperbaiki?',
        answer:
          'Panitia akan menulis catatannya di akunmu. Baca catatannya, lalu unggah ulang berkas yang diminta.',
      },
      {
        question: 'Bagaimana cara mengetahui status pendaftaran?',
        answer:
          'Masuk ke akunmu. Status formulir, berkas, pembayaran, dan pengumuman dari panitia ada di sana.',
      },
    ],
  },
  stories: {
    label: 'Cerita keluarga MTs Persis 241 Al-Ikhlash',
    title: 'Dengar langsung dari mereka yang menjalaninya.',
    description:
      'Kisah alumni dan orang tua tentang belajar, tumbuh, dan berproses bersama MTs Persis 241 Al-Ikhlash.',
    items: [
      {
        kind: 'Cerita alumni',
        quote:
          'Di MTs Persis 241 Al-Ikhlash saya belajar bahwa ilmu bukan hanya untuk dihafal, tetapi untuk diamalkan. Kebiasaan baik yang ditanamkan guru-guru di sini masih saya bawa sampai sekarang.',
        name: 'Nama alumni',
        position: 'Posisi atau profesi saat ini',
        tags: ['Alumni · Lulus 20XX'],
        photo: null,
        placeholder: true,
      },
      {
        kind: 'Cerita orang tua',
        quote:
          'Anak kami berangkat sekolah dengan senang dan pulang membawa banyak cerita. Kami melihat sendiri ia tumbuh lebih mandiri, rajin beribadah, dan percaya diri.',
        name: 'Nama orang tua',
        position: 'Pekerjaan atau profesi saat ini',
        tags: ['Orang tua santri aktif · Kelas 7'],
        photo: null,
        placeholder: true,
      },
      {
        kind: 'Cerita orang tua',
        quote:
          'Dulu saya belajar di sini, dan sekarang saya mempercayakan anak saya di tempat yang sama. Nilai-nilai yang saya terima dulu masih terjaga, dan itu membuat kami tenang.',
        name: 'Nama orang tua',
        position: 'Pekerjaan atau profesi saat ini',
        tags: ['Alumni · Lulus 20XX', 'Orang tua santri aktif'],
        photo: null,
        placeholder: true,
      },
    ],
  },
  closing: {
    title: 'Sampai bertemu di MTs Persis 241 Al-Ikhlash.',
    description:
      'Mulai dengan satu akun. Lengkapi formulir, kirim berkas, dan ikuti perkembangan pendaftaran dari rumah.',
    registerLabel: 'Mulai pendaftaran',
    requirementsLabel: 'Periksa persyaratan terlebih dahulu',
    photo: {
      image: { src: '/hero/rapat-orangtua.webp' },
      alt: 'Orang tua santri menghadiri pertemuan di MTs Persis 241 Al-Ikhlash',
    },
  },
}
