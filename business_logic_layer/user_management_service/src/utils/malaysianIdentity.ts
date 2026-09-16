/**
 * Malaysian Identity (MyKad / NRIC) Deterministic Identity Resolver
 * 
 * Provides a deterministic, authentic mock generator for Malaysian citizens based on NRIC format:
 * Format: YYMMDD-PB-###G (12 digits)
 * - YYMMDD: Date of Birth
 * - PB: Place of Birth / State Code (JPN canonical table)
 * - ###G: Sequence + Gender (odd = Male, even = Female)
 * 
 * Given any valid 12-digit IC, this resolver deterministically returns the EXACT same
 * full name, gender, date of birth, state of origin, and residential address every time.
 */

export interface MalaysianIdentity {
  rawDigits: string;
  formattedIc: string;
  name: string;
  gender: 'MALE' | 'FEMALE';
  genderLabel: string;
  dateOfBirth: string; // YYYY-MM-DD
  age: number;
  state: string;
  ethnicity: 'MALAY' | 'CHINESE' | 'INDIAN' | 'EAST_MALAYSIAN';
  address: string;
  isValid: boolean;
}

// Canonical JPN State Place-of-Birth (PB) Mapping
const JPN_STATE_MAP: Record<string, string> = {
  '01': 'Johor', '21': 'Johor', '22': 'Johor', '23': 'Johor', '24': 'Johor',
  '02': 'Kedah', '25': 'Kedah', '26': 'Kedah', '27': 'Kedah',
  '03': 'Kelantan', '28': 'Kelantan', '29': 'Kelantan',
  '04': 'Melaka', '30': 'Melaka',
  '05': 'Negeri Sembilan', '31': 'Negeri Sembilan', '59': 'Negeri Sembilan',
  '06': 'Pahang', '32': 'Pahang', '33': 'Pahang',
  '07': 'Pulau Pinang', '34': 'Pulau Pinang', '35': 'Pulau Pinang',
  '08': 'Perak', '36': 'Perak', '37': 'Perak', '38': 'Perak', '39': 'Perak',
  '09': 'Perlis', '40': 'Perlis',
  '10': 'Selangor', '41': 'Selangor', '42': 'Selangor', '43': 'Selangor', '44': 'Selangor',
  '11': 'Terengganu', '45': 'Terengganu', '46': 'Terengganu',
  '12': 'Sabah', '47': 'Sabah', '48': 'Sabah', '49': 'Sabah',
  '13': 'Sarawak', '50': 'Sarawak', '51': 'Sarawak', '52': 'Sarawak', '53': 'Sarawak',
  '14': 'Wilayah Persekutuan Kuala Lumpur', '54': 'Wilayah Persekutuan Kuala Lumpur',
  '55': 'Wilayah Persekutuan Kuala Lumpur', '56': 'Wilayah Persekutuan Kuala Lumpur',
  '57': 'Wilayah Persekutuan Kuala Lumpur',
  '15': 'Wilayah Persekutuan Labuan', '58': 'Wilayah Persekutuan Labuan',
  '16': 'Wilayah Persekutuan Putrajaya',
};

// Demographic Name Pools
const MALAY_MALE_FIRST = [
  'Muhammad Farhan', 'Ahmad Zikri', 'Mohd Hafiz', 'Amirul Haziq', 'Khairul Anuar',
  'Danish Iskandar', 'Syed Alwi', 'Wan Azlan', 'Faizal Hakimi', 'Luqman Hakim',
  'Zulhilmi', 'Megat Iskandar', 'Nik Shamsul', 'Irfan Haris', 'Aidil Zafuan',
  'Haris Fadzilah', 'Nazirul Mubin', 'Shahrul Nizam', 'Hafizuddin', 'Azhar'
];

const MALAY_MALE_FATHER = [
  'Abdullah', 'Othman', 'Ibrahim', 'Mustafa', 'Sulaiman', 'Razak', 'Ismail',
  'Zainal Abidin', 'Hassan', 'Kamaruddin', 'Shamsuddin', 'Yusof', 'Bakar', 'Salleh',
  'Mahmud', 'Alias', 'Hamid', 'Daud', 'Arshad', 'Ghazali'
];

const MALAY_FEMALE_FIRST = [
  'Nur Hidayah', 'Siti Aishah', 'Fatin Nabihah', 'Nurul Ain', 'Farah Nadiah',
  'Anis Syuhada', 'Wan Nurliyana', 'Putri Balqis', 'Syazwani', 'Nurin Jazlina',
  'Nur Sabrina', 'Nik Zulaikha', 'Zalikha', 'Diana Safiya', 'Siti Maryam',
  'Nur Syahirah', 'Alia Maisarah', 'Intan Syafinaz', 'Nor Azlin', 'Haryati'
];

const MALAY_FEMALE_FATHER = [
  'Othman', 'Razali', 'Hamzah', 'Ismail', 'Azman', 'Ariffin', 'Baharuddin',
  'Zahari', 'Mansor', 'Kassim', 'Rosli', 'Yusoff', 'Hussin', 'Nordin', 'Ghafar',
  'Zakaria', 'Zulkifli', 'Jaafar', 'Ramli', 'Nasir'
];

const CHINESE_SURNAMES = [
  'Tan', 'Lim', 'Lee', 'Ng', 'Wong', 'Chong', 'Khoo', 'Goh', 'Chan', 'Teoh',
  'Liew', 'Low', 'Chia', 'Yeoh', 'Cheah', 'Tee', 'Sim', 'Kua', 'Fong', 'Yap'
];

const CHINESE_MALE_GIVEN = [
  'Wei Kang', 'Chee Keong', 'Kai Jie', 'Jun Hao', 'Kok Seng', 'Jian Wei',
  'Zhi Yang', 'Boon Teck', 'Yong Sheng', 'Hao Ran', 'Chun Kiat', 'Sheng Feng',
  'Ming Yang', 'Kian Ann', 'Kah Wai', 'Zhi Ming', 'Wei Lun', 'Jin Quan', 'Chun Sheng'
];

const CHINESE_FEMALE_GIVEN = [
  'Siew Ling', 'Mei Hui', 'Xin Yi', 'Pei Shan', 'Shu Ting', 'Li Ping',
  'Hui Min', 'Jia En', 'Yan Ting', 'Ying Ying', 'Wan Qing', 'Zi Qi',
  'Mei Yan', 'Rui Xin', 'Jia Xin', 'Xue Ting', 'Li Xuan', 'Shi Qi', 'En Qi'
];

const INDIAN_MALE_FIRST = [
  'Ravi', 'Suresh', 'Kavitha', 'Arun', 'Vignesh', 'Dinesh', 'Karthik', 'Sanjeev',
  'Prakash', 'Ganesh', 'Thirunavukkarasu', 'Vijay', 'Mogan', 'Rajesh', 'Anand',
  'Saravanan', 'Devaraj', 'Manojkumar', 'Prabu', 'Harikrishnan'
];

const INDIAN_MALE_FATHER = [
  'Subramaniam', 'Mohan', 'Raman', 'Chandran', 'Kumar', 'Krishnan', 'Govindasamy',
  'Narayanan', 'Murugan', 'Maniam', 'Appadurai', 'Shanmugam', 'Veerasamy', 'Perumal'
];

const INDIAN_FEMALE_FIRST = [
  'Priya', 'Devi', 'Anusha', 'Kavita', 'Shalini', 'Tharani', 'Lavanya', 'Divya',
  'Janani', 'Deepa', 'Sangeetha', 'Roshini', 'Gayathri', 'Nithya', 'Meenakshi',
  'Vithya', 'Uma Mageswari', 'Shanthi', 'Subashini', 'Padma'
];

const INDIAN_FEMALE_FATHER = [
  'Ramesh', 'Sundram', 'Muthusamy', 'Ramasamy', 'Jayakumar', 'Selvam', 'Murugiah',
  'Nadarajah', 'Ravindran', 'Rajagopal', 'Govindaraj', 'Arumugam', 'Gengadaran'
];

const EAST_MALAYSIAN_MALE = [
  { first: 'Brian', father: 'Langit' },
  { first: 'Awang', father: 'Ding' },
  { first: 'Kennedy', father: 'Henry' },
  { first: 'Joshua', father: 'Entri' },
  { first: 'Alvin', father: 'Belaja' },
  { first: 'Garry', father: 'Nyelang' },
  { first: 'Richie', father: 'Pagon' },
  { first: 'Roland', father: 'Saging' },
];

const EAST_MALAYSIAN_FEMALE = [
  { first: 'Patricia', father: 'Empin' },
  { first: 'Dayang', father: 'Rantai' },
  { first: 'Cindy', father: 'Jelian' },
  { first: 'Florence', father: 'Malong' },
  { first: 'Jessica', father: 'Bantin' },
  { first: 'Grace', father: 'Jinggut' },
  { first: 'Angelina', father: 'Semat' },
  { first: 'Veronica', father: 'Kuling' },
];

// State-Specific Locality Pools
interface StateLocality {
  streets: string[];
  townships: string[];
  citiesWithPostcode: { city: string; postcode: string }[];
}

const STATE_LOCALITIES: Record<string, StateLocality> = {
  'Selangor': {
    streets: ['Jalan SS 2/18', 'Persiaran Kewajipan', 'Jalan Plumbum 7/95', 'Jalan Meru', 'Persiaran Kayangan', 'Jalan Universiti', 'Jalan Kenanga', 'Jalan PJS 8/12'],
    townships: ['Taman SEA', 'Seksyen 7', 'Subang Jaya', 'Kota Damansara', 'Bandar Baru Bangi', 'Setia Alam', 'Bandar Sunway', 'Taman Megah'],
    citiesWithPostcode: [
      { city: 'Petaling Jaya', postcode: '47300' },
      { city: 'Shah Alam', postcode: '40000' },
      { city: 'Subang Jaya', postcode: '47500' },
      { city: 'Klang', postcode: '41050' },
      { city: 'Bandar Baru Bangi', postcode: '43650' },
      { city: 'Kajang', postcode: '43000' },
    ],
  },
  'Wilayah Persekutuan Kuala Lumpur': {
    streets: ['Jalan Tun Razak', 'Jalan Ampang', 'Jalan Bukit Bintang', 'Jalan Kuching', 'Jalan Cheras', 'Jalan Telawi 3', 'Jalan Ipoh', 'Jalan Genting Kelang'],
    townships: ['Bangsar Baru', 'Mont Kiara', 'Bukit Damansara', 'Taman Melawati', 'Setapak', 'Cheras', 'Kepong', 'Titiwangsa'],
    citiesWithPostcode: [
      { city: 'Kuala Lumpur', postcode: '50450' },
      { city: 'Kuala Lumpur', postcode: '59100' },
      { city: 'Kuala Lumpur', postcode: '50480' },
      { city: 'Kuala Lumpur', postcode: '53300' },
      { city: 'Kuala Lumpur', postcode: '56000' },
    ],
  },
  'Johor': {
    streets: ['Jalan Skudai', 'Jalan Tebrau', 'Jalan Sutera Danga', 'Jalan Trus', 'Jalan Kluang', 'Jalan Temenggong', 'Jalan Permas 10'],
    townships: ['Taman Universiti', 'Bandar Baru Uda', 'Taman Molek', 'Taman Pelangi', 'Taman Sutera Utama', 'Taman Johor Jaya'],
    citiesWithPostcode: [
      { city: 'Johor Bahru', postcode: '80100' },
      { city: 'Skudai', postcode: '81300' },
      { city: 'Kluang', postcode: '86000' },
      { city: 'Batu Pahat', postcode: '83000' },
      { city: 'Muar', postcode: '84000' },
      { city: 'Kulai', postcode: '81000' },
    ],
  },
  'Perak': {
    streets: ['Jalan Sultan Azlan Shah', 'Jalan Tambun', 'Jalan Kampar', 'Jalan Pasir Puteh', 'Jalan Kuala Kangsar', 'Jalan Gopeng'],
    townships: ['Ipoh Garden', 'Taman Canning', 'Bandar Meru Raya', 'Taman Ipoh Jaya', 'Pasir Pinji', 'Bercham'],
    citiesWithPostcode: [
      { city: 'Ipoh', postcode: '31400' },
      { city: 'Taiping', postcode: '34000' },
      { city: 'Teluk Intan', postcode: '36000' },
      { city: 'Kampar', postcode: '31900' },
      { city: 'Batu Gajah', postcode: '31000' },
    ],
  },
  'Pulau Pinang': {
    streets: ['Jalan Sultan Ahmad Shah', 'Jalan Kelawai', 'Jalan Dato Keramat', 'Jalan Bayan Lepas', 'Jalan Masjid Negeri', 'Jalan Burma'],
    townships: ['Georgetown', 'Bayan Baru', 'Tanjung Tokong', 'Bandar Perda', 'Gelugor', 'Air Itam'],
    citiesWithPostcode: [
      { city: 'Georgetown', postcode: '10050' },
      { city: 'Bayan Lepas', postcode: '11950' },
      { city: 'Tanjung Tokong', postcode: '11200' },
      { city: 'Butterworth', postcode: '12000' },
      { city: 'Bukit Mertajam', postcode: '14000' },
    ],
  },
  'Kedah': {
    streets: ['Jalan Langgar', 'Jalan Sultan Badlishah', 'Jalan Tambang Badak', 'Jalan Lencong Barat', 'Jalan Ibrahim'],
    townships: ['Taman Saga', 'Bandar Laguna Merbok', 'Taman Ria Jaya', 'Taman Selasih', 'Taman Mahsuri'],
    citiesWithPostcode: [
      { city: 'Alor Setar', postcode: '05460' },
      { city: 'Sungai Petani', postcode: '08000' },
      { city: 'Kulim', postcode: '09000' },
      { city: 'Langkawi', postcode: '07000' },
    ],
  },
  'Melaka': {
    streets: ['Jalan Hang Tuah', 'Lebuh Ayer Keroh', 'Jalan Taming Sari', 'Jalan Munshi Abdullah', 'Jalan Melaka Raya 1'],
    townships: ['Taman Melaka Raya', 'Bukit Beruang', 'Ayer Keroh Heights', 'Batu Berendam', 'Taman Merdeka'],
    citiesWithPostcode: [
      { city: 'Melaka City', postcode: '75000' },
      { city: 'Ayer Keroh', postcode: '75450' },
      { city: 'Alor Gajah', postcode: '78000' },
      { city: 'Jasin', postcode: '77000' },
    ],
  },
  'Negeri Sembilan': {
    streets: ['Jalan Rasah', 'Jalan Tuanku Munawir', 'Persiaran Senawang 1', 'Jalan Nilai 3/1', 'Jalan Pantai'],
    townships: ['Seremban 2', 'Taman Rasah Jaya', 'Bandar Baru Nilai', 'Senawang', 'Port Dickson'],
    citiesWithPostcode: [
      { city: 'Seremban', postcode: '70300' },
      { city: 'Nilai', postcode: '71800' },
      { city: 'Port Dickson', postcode: '71000' },
    ],
  },
  'Pahang': {
    streets: ['Jalan Teluk Sisek', 'Jalan Beserah', 'Jalan Gambang', 'Jalan Mahkota', 'Jalan Tras'],
    townships: ['Taman Sri Kuantan', 'Indera Mahkota', 'Bandar Indera Mahkota', 'Taman Tas', 'Mentakab'],
    citiesWithPostcode: [
      { city: 'Kuantan', postcode: '25000' },
      { city: 'Temerloh', postcode: '28000' },
      { city: 'Bentong', postcode: '28700' },
    ],
  },
  'Kelantan': {
    streets: ['Jalan Hospital', 'Jalan Sultan Yahya Petra', 'Jalan Pengkalan Chepa', 'Jalan Hamzah'],
    townships: ['Wakaf Bharu', 'Kubang Kerian', 'Pengkalan Chepa', 'Taman Kenangan'],
    citiesWithPostcode: [
      { city: 'Kota Bharu', postcode: '15000' },
      { city: 'Kubang Kerian', postcode: '16150' },
      { city: 'Pasir Mas', postcode: '17000' },
    ],
  },
  'Terengganu': {
    streets: ['Jalan Sultan Mahmud', 'Jalan Sultan Ismail', 'Jalan Kamaruddin', 'Jalan Tok Lam'],
    townships: ['Batu Buruk', 'Gong Badak', 'Chukai', 'Taman Permint Jaya'],
    citiesWithPostcode: [
      { city: 'Kuala Terengganu', postcode: '20400' },
      { city: 'Chukai', postcode: '24000' },
      { city: 'Dungun', postcode: '23000' },
    ],
  },
  'Sabah': {
    streets: ['Jalan Tuaran', 'Jalan Lintas', 'Jalan Penampang', 'Jalan Coastal', 'Jalan Kepayan'],
    townships: ['Luyang', 'Damai', 'Penampang', 'Likas', 'Inanam'],
    citiesWithPostcode: [
      { city: 'Kota Kinabalu', postcode: '88300' },
      { city: 'Sandakan', postcode: '90000' },
      { city: 'Tawau', postcode: '91000' },
    ],
  },
  'Sarawak': {
    streets: ['Jalan Tun Jugah', 'Jalan Tabuan', 'Jalan Rock', 'Jalan Padungan', 'Jalan Pending'],
    townships: ['Tabuan Jaya', 'Batu Kawa', 'BDC', 'Pending', 'Kenyalang Park'],
    citiesWithPostcode: [
      { city: 'Kuching', postcode: '93350' },
      { city: 'Miri', postcode: '98000' },
      { city: 'Sibu', postcode: '96000' },
      { city: 'Bintulu', postcode: '97000' },
    ],
  },
  'Wilayah Persekutuan Putrajaya': {
    streets: ['Lebuh Perdana Barat', 'Persiaran Sultan Sallahuddin Abdul Aziz Shah', 'Lebuh Bestari', 'Lebuh Wawasan'],
    townships: ['Presint 8', 'Presint 9', 'Presint 11', 'Presint 14', 'Presint 16'],
    citiesWithPostcode: [
      { city: 'Putrajaya', postcode: '62000' },
      { city: 'Putrajaya', postcode: '62250' },
      { city: 'Putrajaya', postcode: '62300' },
    ],
  },
  'Wilayah Persekutuan Labuan': {
    streets: ['Jalan Tun Mustapha', 'Jalan Merdeka', 'Jalan Rancha-Rancha', 'Jalan Tanjung Kubong'],
    townships: ['Bandar Labuan', 'Rancha-Rancha', 'Bebuloh', 'Sungai Bedaun'],
    citiesWithPostcode: [
      { city: 'Labuan', postcode: '87000' },
    ],
  },
  'Perlis': {
    streets: ['Jalan Raja Syed Alwi', 'Jalan Bukit Lagi', 'Jalan Arau-Kodiang', 'Jalan Kaki Bukit'],
    townships: ['Taman Sena Indah', 'Repoh', 'Arau', 'Padang Besar'],
    citiesWithPostcode: [
      { city: 'Kangar', postcode: '01000' },
      { city: 'Arau', postcode: '02600' },
    ],
  },
};

/**
 * Fast 32-bit polynomial string hasher
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Resolves a Malaysian IC number into a complete, deterministic, realistic citizen identity.
 */
export function resolveMalaysianIdentity(icInput: string | null | undefined): MalaysianIdentity {
  const digits = String(icInput || '').replace(/\D/g, '').slice(0, 12);
  const isValid = digits.length === 12;

  // Fallback / defaults for partial digits
  const padded = digits.padEnd(12, '0');
  const yy = padded.slice(0, 2);
  const mm = padded.slice(2, 4);
  const dd = padded.slice(4, 6);
  const pb = padded.slice(6, 8);
  const lastDigit = parseInt(padded[11], 10) || 0;

  // 1. Gender: odd = MALE, even = FEMALE
  const gender: 'MALE' | 'FEMALE' = (lastDigit % 2 === 1) ? 'MALE' : 'FEMALE';
  const genderLabel = gender === 'MALE' ? 'Lelaki (Male)' : 'Perempuan (Female)';

  // 2. Date of Birth
  const yyNum = parseInt(yy, 10) || 0;
  const currentYear = new Date().getFullYear();
  // Threshold: if YY > current 2-digit year (e.g. > 26), 1900s; else 2000s
  const fullYear = yyNum > (currentYear % 100) ? 1900 + yyNum : 2000 + yyNum;
  const clampedMonth = Math.min(12, Math.max(1, parseInt(mm, 10) || 1));
  const clampedDay = Math.min(28, Math.max(1, parseInt(dd, 10) || 1));
  const dateOfBirth = `${fullYear}-${String(clampedMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
  const age = Math.max(0, currentYear - fullYear);

  // 3. State from JPN PB code
  const state = JPN_STATE_MAP[pb] || 'Selangor';

  // 4. Deterministic Hash
  const hash = hashString(padded);

  // 5. Ethnicity & Full Name
  const ethnicityRoll = hash % 100;
  let ethnicity: 'MALAY' | 'CHINESE' | 'INDIAN' | 'EAST_MALAYSIAN';
  let name = '';

  if (ethnicityRoll < 60) {
    // 60% Malay
    ethnicity = 'MALAY';
    if (gender === 'MALE') {
      const first = MALAY_MALE_FIRST[(hash >> 2) % MALAY_MALE_FIRST.length];
      const father = MALAY_MALE_FATHER[(hash >> 5) % MALAY_MALE_FATHER.length];
      name = `${first} bin ${father}`;
    } else {
      const first = MALAY_FEMALE_FIRST[(hash >> 2) % MALAY_FEMALE_FIRST.length];
      const father = MALAY_FEMALE_FATHER[(hash >> 5) % MALAY_FEMALE_FATHER.length];
      name = `${first} binti ${father}`;
    }
  } else if (ethnicityRoll < 85) {
    // 25% Chinese
    ethnicity = 'CHINESE';
    const surname = CHINESE_SURNAMES[(hash >> 2) % CHINESE_SURNAMES.length];
    if (gender === 'MALE') {
      const given = CHINESE_MALE_GIVEN[(hash >> 5) % CHINESE_MALE_GIVEN.length];
      name = `${surname} ${given}`;
    } else {
      const given = CHINESE_FEMALE_GIVEN[(hash >> 5) % CHINESE_FEMALE_GIVEN.length];
      name = `${surname} ${given}`;
    }
  } else if (ethnicityRoll < 95) {
    // 10% Indian
    ethnicity = 'INDIAN';
    if (gender === 'MALE') {
      const first = INDIAN_MALE_FIRST[(hash >> 2) % INDIAN_MALE_FIRST.length];
      const father = INDIAN_MALE_FATHER[(hash >> 5) % INDIAN_MALE_FATHER.length];
      name = `${first} a/l ${father}`;
    } else {
      const first = INDIAN_FEMALE_FIRST[(hash >> 2) % INDIAN_FEMALE_FIRST.length];
      const father = INDIAN_FEMALE_FATHER[(hash >> 5) % INDIAN_FEMALE_FATHER.length];
      name = `${first} a/p ${father}`;
    }
  } else {
    // 5% East Malaysian
    ethnicity = 'EAST_MALAYSIAN';
    if (gender === 'MALE') {
      const pair = EAST_MALAYSIAN_MALE[(hash >> 3) % EAST_MALAYSIAN_MALE.length];
      name = `${pair.first} anak ${pair.father}`;
    } else {
      const pair = EAST_MALAYSIAN_FEMALE[(hash >> 3) % EAST_MALAYSIAN_FEMALE.length];
      name = `${pair.first} anak ${pair.father}`;
    }
  }

  // 6. State-Accurate Address Generation
  const locality = STATE_LOCALITIES[state] || STATE_LOCALITIES['Selangor'];
  const street = locality.streets[(hash >> 4) % locality.streets.length];
  const township = locality.townships[(hash >> 6) % locality.townships.length];
  const cityObj = locality.citiesWithPostcode[(hash >> 8) % locality.citiesWithPostcode.length];
  const houseNum = (hash % 168) + 1;
  const hasUnit = (hash % 4) === 0;
  const unitPrefix = hasUnit ? `No. ${houseNum}, Tingkat ${(hash % 12) + 1}, ` : `No. ${houseNum}, `;

  const address = `${unitPrefix}${street}, ${township}, ${cityObj.postcode} ${cityObj.city}, ${state}`;

  const formattedIc = isValid
    ? `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`
    : digits;

  return {
    rawDigits: digits,
    formattedIc,
    name,
    gender,
    genderLabel,
    dateOfBirth,
    age,
    state,
    ethnicity,
    address,
    isValid,
  };
}
