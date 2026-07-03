const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.json');

// Pool of natural Indonesian names (Male and Female)
const namesPool = [
  'Budi Santoso', 'Agus Prayitno', 'Rian Hidayat', 'Siti Aminah', 'Dewi Lestari',
  'Aditya Pratama', 'Rizky Amelia', 'Eko Prasetyo', 'Dian Wahyuni', 'Indah Permatasari',
  'Fajar Nugroho', 'Putri Utami', 'Andi Wijaya', 'Slamet Riyadi', 'Sri Wahyuni',
  'Hendra Setiawan', 'Wulan Dari', 'Taufik Hidayat', 'Rina Marlina', 'Yanto Rudianto',
  'Mega Silvia', 'Denny Cahyadi', 'Angga Saputra', 'Dwi Lestari', 'Bambang Pamungkas',
  'Kartika Sari', 'Doni Setiawan', 'Aris Munandar', 'Novianti', 'Rudi Hermawan',
  'Fitriani', 'Gilang Dirga', 'Dimas Anggara', 'Larasati', 'Ahmad Fauzi',
  'Septian Dwi', 'Desi Natalia', 'Rahmat Hidayat', 'Yuni Shara', 'Bayu Adi',
  'Riska Amelia', 'Tomi Wijaya', 'Ika Kartika', 'Ferry Irawan', 'Niken',
  'Ari Wibowo', 'Wahyudi', 'Tri Utami', 'Dedi Kusnandar', 'Agnes Monica',
  'Faisal', 'Rani Permata', 'Galih Purnama', 'Ratna Sari', 'Yuda Pratama',
  'Anisa Rahma', 'Kiki Rizky', 'Siska Lestari', 'Dafa Alfarizi', 'Maya Indah',
  'Lukman Hakim', 'Santi', 'Robby Purba', 'Tanti Widya', 'Sony Sugema',
  'Dona Amelia', 'Zacky', 'Nabila Syakieb', 'Bagas', 'Cynthia Bella',
  'Roni', 'Zaskia', 'Fajar Sidik', 'Widya', 'Reza Rahadian',
  'Lusi', 'Asep Surasep', 'Ujang', 'Dadang', 'Cecep',
  'Yayan', 'Maman', 'Teten', 'Joko Susilo', 'Ririn',
  'Toto', 'Didik', 'Joni', 'Gery', 'Beni',
  'Chandra', 'Indra', 'Eka', 'Agung', 'Pipin'
];

// Pool of realistic participant messages (Indonesian style)
const messagesPool = [
  'Bismillah, semoga hoki gipweynya min!',
  'Iseng-iseng berhadiah, wish me luck.',
  'Semoga rejeki buat bayar uang kosan bulan ini wkwk.',
  'Yuk bisa yuk menang kali ini!',
  'Bismillah semoga dapet gipweynya, sukses terus min.',
  'Moga-moga beruntung, amin!',
  'Ikutan gacha gipwey. Bismillah!',
  'Siapa tau rezeki anak sholeh.',
  'Gaspol min, moga kecantol namanya.',
  'Bismillah rezeki tidak kemana.',
  'Semoga berkah gipweynya buat semuanya.',
  'Bismillah, kepingin banget dapet ini.',
  'Kalo rejeki ga bakal ketuker, bismillah.',
  'Admin ganteng moga rejekinya nular ke saya haha.',
  'Ikut meramaikan min, moga dapet.',
  'Wish me luck! Sukses terus acaranya.',
  'Moga menang buat beliin adek mainan.',
  'Bismillahirohmanirohim...',
  'Menang ra menang sing penting melu gacha.',
  'Moga dapet min buat nambah uang jajan.',
  'Bismillah ya Allah, mudahan beruntung.',
  'Nyoba keberuntungan di sini, siapa tau hoki.',
  'Up min! Moga menang.',
  'Ikutan gipwey seru ini, moga nama gua keluar.',
  'Bismillah moga dapet jackpot.',
  'Semoga dapet giliran menang kali ini.'
];

// Indonesian carrier prefixes
const phonePrefixes = [
  '0812', '0813', '0821', '0822', // Telkomsel
  '0857', '0856', '0858',         // Indosat
  '0877', '0878', '0819',         // XL
  '0896', '0895', '0897', '0899', // Three
  '0881', '0882', '0888'          // Smartfren
];

function generateRandomPhone() {
  const prefix = phonePrefixes[Math.floor(Math.random() * phonePrefixes.length)];
  // Generates 7 to 9 random digits
  let rest = '';
  const length = Math.random() > 0.5 ? 8 : 7;
  for (let i = 0; i < length; i++) {
    rest += Math.floor(Math.random() * 10);
  }
  return prefix + rest;
}

function seed(count = 95) {
  console.log(`Starting seeding of ${count} participants...`);
  
  const participants = [];
  const usedNames = new Set();
  const usedPhones = new Set();

  for (let i = 0; i < count; i++) {
    // Select unique name
    let name = '';
    let attempts = 0;
    do {
      const baseName = namesPool[Math.floor(Math.random() * namesPool.length)];
      // If we run out of unique names, append a random number or initial
      name = usedNames.has(baseName) 
        ? `${baseName} ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`
        : baseName;
      attempts++;
    } while (usedNames.has(name) && attempts < 100);

    usedNames.add(name);

    // Select unique phone
    let phone = '';
    do {
      phone = generateRandomPhone();
    } while (usedPhones.has(phone));
    usedPhones.add(phone);

    // Select message
    const message = messagesPool[Math.floor(Math.random() * messagesPool.length)];

    // Generate natural registration time spanning the last 2 hours
    const minutesAgo = Math.floor(Math.random() * 120);
    const createdAt = new Date(Date.now() - minutesAgo * 60000).toISOString();

    participants.push({
      id: Math.random().toString(36).substring(2, 10),
      name: name,
      whatsapp: phone,
      message: message,
      createdAt: createdAt
    });
  }

  // Sort participants by createdAt so they display in chronological order
  participants.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const dbData = {
    status: 'active',
    winners: [],
    participants: participants
  };

  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2), 'utf8');
    console.log(`Successfully seeded database with ${participants.length} realistic Indonesian participants!`);
    console.log(`DB File: ${DB_PATH}`);
  } catch (error) {
    console.error('Error writing seed data to database:', error);
  }
}

// Run seeder
seed(95);
