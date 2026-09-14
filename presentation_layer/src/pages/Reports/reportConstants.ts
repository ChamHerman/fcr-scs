export const STATES: Record<string, string[]> = {
  Johor: ['Batu Pahat', 'Johor Bahru', 'Kluang', 'Kota Tinggi', 'Kulai', 'Mersing', 'Muar', 'Pontian', 'Segamat', 'Tangkak'],
  Kedah: ['Baling', 'Bandar Baharu', 'Kota Setar', 'Kuala Muda', 'Kubang Pasu', 'Kulim', 'Langkawi', 'Padang Terap', 'Pendang', 'Pokok Sena', 'Sik', 'Yan'],
  Kelantan: ['Bachok', 'Gua Musang', 'Jeli', 'Kota Bharu', 'Kuala Krai', 'Machang', 'Pasir Mas', 'Pasir Puteh', 'Tanah Merah', 'Tumpat'],
  Melaka: ['Alor Gajah', 'Melaka Tengah', 'Jasin'],
  'Negeri Sembilan': ['Jelebu', 'Jempol', 'Kuala Pilah', 'Port Dickson', 'Rembau', 'Seremban', 'Tampin'],
  Pahang: ['Bentong', 'Bera', 'Cameron Highlands', 'Jerantut', 'Kuantan', 'Lipis', 'Maran', 'Pekan', 'Raub', 'Rompin', 'Temerloh'],
  Penang: ['Seberang Perai Utara', 'Seberang Perai Tengah', 'Seberang Perai Selatan', 'Timur Laut', 'Barat Daya'],
  Perak: ['Bagan Datuk', 'Batang Padang', 'Hilir Perak', 'Hulu Perak', 'Kampar', 'Kerian', 'Kinta', 'Kuala Kangsar', 'Larut, Matang dan Selama', 'Manjung', 'Muallim', 'Perak Tengah'],
  Perlis: ['Arau', 'Kangar', 'Padang Besar'],
  Sabah: ['Beaufort', 'Beluran', 'Kalabakan', 'Keningau', 'Kinabatangan', 'Kota Belud', 'Kota Kinabalu', 'Kota Marudu', 'Kuala Penyu', 'Kudat', 'Kunak', 'Lahad Datu', 'Membakut', 'Nabawan', 'Papar', 'Penampang', 'Pitas', 'Ranau', 'Sandakan', 'Semporna', 'Sipitang', 'Tambunan', 'Tawau', 'Telupid', 'Tenom', 'Tongod', 'Tuaran'],
  Sarawak: ['Asajaya', 'Bau', 'Belaga', 'Beluru', 'Betong', 'Bintulu', 'Dalit', 'Daro', 'Julau', 'Kanowit', 'Kapit', 'Kuching', 'Lawas', 'Limbang', 'Lubok Antu', 'Lundu', 'Marudi', 'Matu', 'Meradong', 'Miri', 'Mukah', 'Pakan', 'Pusa', 'Samarahan', 'Saratok', 'Sarikei', 'Selangau', 'Serian', 'Sibu', 'Simunjan', 'Song', 'Sri Aman', 'Tatau', 'Tebedu', 'Telang Usan'],
  Selangor: ['Gombak', 'Hulu Langat', 'Hulu Selangor', 'Klang', 'Kuala Langat', 'Kuala Selangor', 'Petaling', 'Sabak Bernam', 'Sepang'],
  Terengganu: ['Besut', 'Dungun', 'Hulu Terengganu', 'Kemaman', 'Kuala Nerus', 'Kuala Terengganu', 'Marang', 'Setiu'],
  'Kuala Lumpur': ['Kuala Lumpur'],
  Labuan: ['Labuan'],
  Putrajaya: ['Putrajaya']
};

export const REPORT_TYPES = [
  'Case Status Report',
  'Payment Report',
  'Blockchain Audit Report',
  'Compensation Summary Report',
  'Asset Valuation Report',
  'Performance Report',
  'Compliance Report'
];

export const CASE_STATUS_OPTIONS = [
  'All',
  'CASE_REGISTERED',
  'VALUATION_IN_PROGRESS',
  'PENDING_VALUATION_APPROVAL',
  'VALUATION_APPROVED',
  'PENDING_COMPENSATION_APPROVAL',
  'COMPENSATION_APPROVED',
  'OFFER_ISSUED',
  'PAYMENT_IN_PROGRESS',
  'PAYMENT_COMPLETED',
  'CASE_CLOSED'
];

export const PAYMENT_STATUS_OPTIONS = [
  'All',
  'Approved',
  'Transfer Initiated',
  'Paid',
  'Failed'
];

export const BLOCKCHAIN_STATUS_OPTIONS = [
  'All',
  'Published',
  'Ready to Publish'
];
