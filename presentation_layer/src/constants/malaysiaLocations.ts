import type { SelectOption } from "../components/ui/Select";

/**
 * List of Malaysian States and Federal Territories
 */
export const MALAYSIA_STATES = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Perak",
  "Perlis",
  "Pulau Pinang",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
  "Wilayah Persekutuan Kuala Lumpur",
  "Wilayah Persekutuan Labuan",
  "Wilayah Persekutuan Putrajaya",
] as const;

export type MalaysiaState = (typeof MALAYSIA_STATES)[number];

export const MALAYSIA_STATE_OPTIONS: SelectOption[] = [
  { value: "", label: "Select state" },
  ...MALAYSIA_STATES.map((state) => ({ value: state, label: state })),
];

/**
 * Mapping of Malaysian States to their respective administrative Districts
 */
export const MALAYSIA_DISTRICTS_MAP: Record<string, string[]> = {
  Johor: [
    "Batu Pahat",
    "Johor Bahru",
    "Kluang",
    "Kota Tinggi",
    "Kulai",
    "Mersing",
    "Muar",
    "Pontian",
    "Segamat",
    "Tangkak",
  ],
  Kedah: [
    "Baling",
    "Bandar Baharu",
    "Kota Setar",
    "Kuala Muda",
    "Kubang Pasu",
    "Kulim",
    "Langkawi",
    "Padang Terap",
    "Pendang",
    "Pokok Sena",
    "Sik",
    "Yan",
  ],
  Kelantan: [
    "Bachok",
    "Gua Musang",
    "Jeli",
    "Kota Bharu",
    "Kuala Krai",
    "Machang",
    "Pasir Mas",
    "Pasir Puteh",
    "Tanah Merah",
    "Tumpat",
  ],
  Melaka: [
    "Alor Gajah",
    "Jasin",
    "Melaka Tengah",
  ],
  "Negeri Sembilan": [
    "Jelebu",
    "Jempol",
    "Kuala Pilah",
    "Port Dickson",
    "Rembau",
    "Seremban",
    "Tampin",
  ],
  Pahang: [
    "Bentong",
    "Bera",
    "Cameron Highlands",
    "Jerantut",
    "Kuantan",
    "Lipis",
    "Maran",
    "Pekan",
    "Raub",
    "Rompin",
    "Temerloh",
  ],
  Perak: [
    "Bagan Datuk",
    "Batang Padang",
    "Hilir Perak",
    "Hulu Perak",
    "Kampar",
    "Kerian",
    "Kinta",
    "Kuala Kangsar",
    "Larut, Matang dan Selama",
    "Manjung",
    "Muallim",
    "Perak Tengah",
  ],
  Perlis: [
    "Kangar",
    "Arau",
    "Padang Besar",
  ],
  "Pulau Pinang": [
    "Barat Daya",
    "Seberang Perai Selatan",
    "Seberang Perai Tengah",
    "Seberang Perai Utara",
    "Timur Laut",
  ],
  Sabah: [
    "Beaufort",
    "Beluran",
    "Kalabakan",
    "Keningau",
    "Kinabatangan",
    "Kota Belud",
    "Kota Kinabalu",
    "Kota Marudu",
    "Kuala Penyu",
    "Kudat",
    "Kunak",
    "Lahad Datu",
    "Nabawan",
    "Papar",
    "Penampang",
    "Putatan",
    "Ranau",
    "Sandakan",
    "Semporna",
    "Sipitang",
    "Tambunan",
    "Tawau",
    "Telupid",
    "Tenom",
    "Tongod",
    "Tuaran",
  ],
  Sarawak: [
    "Betong",
    "Bintulu",
    "Kapit",
    "Kuching",
    "Limbang",
    "Miri",
    "Mukah",
    "Samarahan",
    "Sarikei",
    "Serian",
    "Sibu",
    "Sri Aman",
  ],
  Selangor: [
    "Gombak",
    "Hulu Langat",
    "Hulu Selangor",
    "Klang",
    "Kuala Langat",
    "Kuala Selangor",
    "Petaling",
    "Sabak Bernam",
    "Sepang",
  ],
  Terengganu: [
    "Besut",
    "Dungun",
    "Hulu Terengganu",
    "Kemaman",
    "Kuala Nerus",
    "Kuala Terengganu",
    "Marang",
    "Setiu",
  ],
  "Wilayah Persekutuan Kuala Lumpur": [
    "Bandar Tun Razak",
    "Batu",
    "Bukit Bintang",
    "Cheras",
    "Kepong",
    "Lembah Pantai",
    "Segambut",
    "Seputeh",
    "Setiawangsa",
    "Titiwangsa",
    "Wangsa Maju",
  ],
  "Wilayah Persekutuan Labuan": [
    "Labuan",
    "Victoria",
  ],
  "Wilayah Persekutuan Putrajaya": [
    "Putrajaya",
  ],
};

/**
 * Reverse lookup mapping from District to its parent State
 */
export const DISTRICT_TO_STATE_MAP: Record<string, string> = {};
Object.entries(MALAYSIA_DISTRICTS_MAP).forEach(([state, districts]) => {
  districts.forEach((d) => {
    DISTRICT_TO_STATE_MAP[d] = state;
  });
});
