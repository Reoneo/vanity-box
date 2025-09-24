import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 
  | 'en' 
  | 'ca' 
  | 'zh-CN' 
  | 'fr' 
  | 'de' 
  | 'hi' 
  | 'ja' 
  | 'ko' 
  | 'pl' 
  | 'pt' 
  | 'es' 
  | 'es-419' 
  | 'ms' 
  | 'th' 
  | 'id' 
  | 'zh-TW';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    // Try to get language from localStorage first
    const saved = localStorage.getItem('vanity-language');
    if (saved && isValidLanguage(saved)) {
      return saved as Language;
    }
    
    // Fallback to browser language detection
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('zh-tw') || browserLang.startsWith('zh-hant')) return 'zh-TW';
    if (browserLang.startsWith('zh')) return 'zh-CN';
    if (browserLang.startsWith('es-mx') || browserLang.startsWith('es-ar') || browserLang.startsWith('es-co')) return 'es-419';
    if (browserLang.startsWith('es')) return 'es';
    if (browserLang.startsWith('fr')) return 'fr';
    if (browserLang.startsWith('de')) return 'de';
    if (browserLang.startsWith('hi')) return 'hi';
    if (browserLang.startsWith('ja')) return 'ja';
    if (browserLang.startsWith('ko')) return 'ko';
    if (browserLang.startsWith('pl')) return 'pl';
    if (browserLang.startsWith('pt')) return 'pt';
    if (browserLang.startsWith('ca')) return 'ca';
    if (browserLang.startsWith('ms')) return 'ms';
    if (browserLang.startsWith('th')) return 'th';
    if (browserLang.startsWith('id')) return 'id';
    
    return 'en';
  });

  useEffect(() => {
    localStorage.setItem('vanity-language', language);
  }, [language]);

  const t = (key: string): string => {
    const translations = getTranslations(language);
    return translations[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

function isValidLanguage(lang: string): boolean {
  const validLanguages: Language[] = [
    'en', 'ca', 'zh-CN', 'fr', 'de', 'hi', 'ja', 'ko', 'pl', 'pt', 'es', 'es-419', 'ms', 'th', 'id', 'zh-TW'
  ];
  return validLanguages.includes(lang as Language);
}

function getTranslations(language: Language): Record<string, string> {
  const translations: Record<Language, Record<string, string>> = {
    en: {
      'theme': 'Theme',
      'language': 'Language',
      'your_personalized_digital_id': 'Your Personalised Digital ID',
      'search_for_a_name': 'Search for a name',
      'connect': 'Connect',
      'connecting': 'Connecting...',
      'my_domains': 'My Domains',
      'disconnect': 'Disconnect',
      'copyright': '© 2025 vanity.box. All rights reserved.',
      'mint_now': 'Mint Now',
      'filters': 'Filters',
      'protocol': 'Protocol',
      'club': 'Club',
      'english': 'English',
      'catalan': 'Catalan',
      'chinese_simplified': 'Chinese (Simplified)',
      'french': 'French',
      'german': 'German',
      'hindi': 'Hindi',
      'japanese': 'Japanese',
      'korean': 'Korean',
      'polish': 'Polish',
      'portuguese': 'Portuguese',
      'spanish': 'Spanish',
      'spanish_latin_america': 'Spanish (Latin America)',
      'malay': 'Malay',
      'thai': 'Thai',
      'indonesian': 'Indonesian',
      'traditional_chinese_taiwan': 'Traditional Chinese (Taiwan)'
    },
    ca: {
      'theme': 'Tema',
      'language': 'Idioma',
      'your_personalized_digital_id': 'La Teva Identitat Digital Personalitzada',
      'search_for_a_name': 'Busca un nom',
      'connect': 'Connectar',
      'connecting': 'Connectant...',
      'my_domains': 'Els Meus Dominis',
      'disconnect': 'Desconnectar',
      'copyright': '© 2025 vanity.box. Tots els drets reservats.',
      'mint_now': 'Encunyar Ara',
      'filters': 'Filtres',
      'protocol': 'Protocol',
      'club': 'Club',
      'english': 'Anglès',
      'catalan': 'Català',
      'chinese_simplified': 'Xinès (Simplificat)',
      'french': 'Francès',
      'german': 'Alemany',
      'hindi': 'Hindi',
      'japanese': 'Japonès',
      'korean': 'Coreà',
      'polish': 'Polonès',
      'portuguese': 'Portuguès',
      'spanish': 'Espanyol',
      'spanish_latin_america': 'Espanyol (Amèrica Llatina)',
      'malay': 'Malai',
      'thai': 'Tailandès',
      'indonesian': 'Indonesi',
      'traditional_chinese_taiwan': 'Xinès Tradicional (Taiwan)'
    },
    'zh-CN': {
      'theme': '主题',
      'language': '语言',
      'your_personalized_digital_id': '您的个性化数字身份',
      'search_for_a_name': '搜索名称',
      'connect': '连接',
      'connecting': '连接中...',
      'my_domains': '我的域名',
      'disconnect': '断开连接',
      'copyright': '© 2025 vanity.box. 保留所有权利。',
      'mint_now': '立即铸造',
      'filters': '过滤器',
      'protocol': '协议',
      'club': '俱乐部',
      'english': '英语',
      'catalan': '加泰罗尼亚语',
      'chinese_simplified': '中文（简体）',
      'french': '法语',
      'german': '德语',
      'hindi': '印地语',
      'japanese': '日语',
      'korean': '韩语',
      'polish': '波兰语',
      'portuguese': '葡萄牙语',
      'spanish': '西班牙语',
      'spanish_latin_america': '西班牙语（拉丁美洲）',
      'malay': '马来语',
      'thai': '泰语',
      'indonesian': '印尼语',
      'traditional_chinese_taiwan': '繁体中文（台湾）'
    },
    fr: {
      'theme': 'Thème',
      'language': 'Langue',
      'your_personalized_digital_id': 'Votre Identité Numérique Personnalisée',
      'search_for_a_name': 'Rechercher un nom',
      'connect': 'Connecter',
      'connecting': 'Connexion...',
      'my_domains': 'Mes Domaines',
      'disconnect': 'Déconnecter',
      'copyright': '© 2025 vanity.box. Tous droits réservés.',
      'mint_now': 'Frapper Maintenant',
      'filters': 'Filtres',
      'protocol': 'Protocole',
      'club': 'Club',
      'english': 'Anglais',
      'catalan': 'Catalan',
      'chinese_simplified': 'Chinois (Simplifié)',
      'french': 'Français',
      'german': 'Allemand',
      'hindi': 'Hindi',
      'japanese': 'Japonais',
      'korean': 'Coréen',
      'polish': 'Polonais',
      'portuguese': 'Portugais',
      'spanish': 'Espagnol',
      'spanish_latin_america': 'Espagnol (Amérique Latine)',
      'malay': 'Malais',
      'thai': 'Thaï',
      'indonesian': 'Indonésien',
      'traditional_chinese_taiwan': 'Chinois Traditionnel (Taïwan)'
    },
    de: {
      'theme': 'Design',
      'language': 'Sprache',
      'your_personalized_digital_id': 'Ihre Personalisierte Digitale Identität',
      'search_for_a_name': 'Nach einem Namen suchen',
      'connect': 'Verbinden',
      'connecting': 'Verbinde...',
      'my_domains': 'Meine Domains',
      'disconnect': 'Trennen',
      'copyright': '© 2025 vanity.box. Alle Rechte vorbehalten.',
      'mint_now': 'Jetzt Prägen',
      'filters': 'Filter',
      'protocol': 'Protokoll',
      'club': 'Club',
      'english': 'Englisch',
      'catalan': 'Katalanisch',
      'chinese_simplified': 'Chinesisch (Vereinfacht)',
      'french': 'Französisch',
      'german': 'Deutsch',
      'hindi': 'Hindi',
      'japanese': 'Japanisch',
      'korean': 'Koreanisch',
      'polish': 'Polnisch',
      'portuguese': 'Portugiesisch',
      'spanish': 'Spanisch',
      'spanish_latin_america': 'Spanisch (Lateinamerika)',
      'malay': 'Malaiisch',
      'thai': 'Thailändisch',
      'indonesian': 'Indonesisch',
      'traditional_chinese_taiwan': 'Traditionelles Chinesisch (Taiwan)'
    },
    hi: {
      'theme': 'थीम',
      'language': 'भाषा',
      'your_personalized_digital_id': 'आपकी व्यक्तिगत डिजिटल पहचान',
      'search_for_a_name': 'नाम खोजें',
      'connect': 'कनेक्ट',
      'connecting': 'कनेक्ट हो रहा है...',
      'my_domains': 'मेरे डोमेन',
      'disconnect': 'डिस्कनेक्ट',
      'copyright': '© 2025 vanity.box. सभी अधिकार सुरक्षित।',
      'mint_now': 'अभी मिंट करें',
      'filters': 'फिल्टर',
      'protocol': 'प्रोटोकॉल',
      'club': 'क्लब',
      'english': 'अंग्रेजी',
      'catalan': 'कैटलन',
      'chinese_simplified': 'चीनी (सरलीकृत)',
      'french': 'फ्रेंच',
      'german': 'जर्मन',
      'hindi': 'हिंदी',
      'japanese': 'जापानी',
      'korean': 'कोरियाई',
      'polish': 'पोलिश',
      'portuguese': 'पुर्तगाली',
      'spanish': 'स्पेनिश',
      'spanish_latin_america': 'स्पेनिश (लैटिन अमेरिका)',
      'malay': 'मलय',
      'thai': 'थाई',
      'indonesian': 'इंडोनेशियाई',
      'traditional_chinese_taiwan': 'पारंपरिक चीनी (ताइवान)'
    },
    ja: {
      'theme': 'テーマ',
      'language': '言語',
      'your_personalized_digital_id': 'あなたのパーソナライズされたデジタルID',
      'search_for_a_name': '名前を検索',
      'connect': '接続',
      'connecting': '接続中...',
      'my_domains': 'マイドメイン',
      'disconnect': '切断',
      'copyright': '© 2025 vanity.box. 全著作権所有。',
      'mint_now': '今すぐミント',
      'filters': 'フィルター',
      'protocol': 'プロトコル',
      'club': 'クラブ',
      'english': '英語',
      'catalan': 'カタルーニャ語',
      'chinese_simplified': '中国語（簡体字）',
      'french': 'フランス語',
      'german': 'ドイツ語',
      'hindi': 'ヒンディー語',
      'japanese': '日本語',
      'korean': '韓国語',
      'polish': 'ポーランド語',
      'portuguese': 'ポルトガル語',
      'spanish': 'スペイン語',
      'spanish_latin_america': 'スペイン語（ラテンアメリカ）',
      'malay': 'マレー語',
      'thai': 'タイ語',
      'indonesian': 'インドネシア語',
      'traditional_chinese_taiwan': '繁体字中国語（台湾）'
    },
    ko: {
      'theme': '테마',
      'language': '언어',
      'your_personalized_digital_id': '당신의 개인화된 디지털 ID',
      'search_for_a_name': '이름 검색',
      'connect': '연결',
      'connecting': '연결 중...',
      'my_domains': '내 도메인',
      'disconnect': '연결 해제',
      'copyright': '© 2025 vanity.box. 모든 권리 보유.',
      'mint_now': '지금 민팅',
      'filters': '필터',
      'protocol': '프로토콜',
      'club': '클럽',
      'english': '영어',
      'catalan': '카탈루냐어',
      'chinese_simplified': '중국어 (간체)',
      'french': '프랑스어',
      'german': '독일어',
      'hindi': '힌디어',
      'japanese': '일본어',
      'korean': '한국어',
      'polish': '폴란드어',
      'portuguese': '포르투갈어',
      'spanish': '스페인어',
      'spanish_latin_america': '스페인어 (라틴 아메리카)',
      'malay': '말레이어',
      'thai': '태국어',
      'indonesian': '인도네시아어',
      'traditional_chinese_taiwan': '번체 중국어 (대만)'
    },
    pl: {
      'theme': 'Motyw',
      'language': 'Język',
      'your_personalized_digital_id': 'Twoja Spersonalizowana Tożsamość Cyfrowa',
      'search_for_a_name': 'Wyszukaj nazwę',
      'connect': 'Połącz',
      'connecting': 'Łączenie...',
      'my_domains': 'Moje Domeny',
      'disconnect': 'Rozłącz',
      'copyright': '© 2025 vanity.box. Wszelkie prawa zastrzeżone.',
      'mint_now': 'Mint Teraz',
      'filters': 'Filtry',
      'protocol': 'Protokół',
      'club': 'Klub',
      'english': 'Angielski',
      'catalan': 'Kataloński',
      'chinese_simplified': 'Chiński (Uproszczony)',
      'french': 'Francuski',
      'german': 'Niemiecki',
      'hindi': 'Hindi',
      'japanese': 'Japoński',
      'korean': 'Koreański',
      'polish': 'Polski',
      'portuguese': 'Portugalski',
      'spanish': 'Hiszpański',
      'spanish_latin_america': 'Hiszpański (Ameryka Łacińska)',
      'malay': 'Malajski',
      'thai': 'Tajski',
      'indonesian': 'Indonezyjski',
      'traditional_chinese_taiwan': 'Chiński Tradycyjny (Tajwan)'
    },
    pt: {
      'theme': 'Tema',
      'language': 'Idioma',
      'your_personalized_digital_id': 'Sua Identidade Digital Personalizada',
      'search_for_a_name': 'Pesquisar um nome',
      'connect': 'Conectar',
      'connecting': 'Conectando...',
      'my_domains': 'Meus Domínios',
      'disconnect': 'Desconectar',
      'copyright': '© 2025 vanity.box. Todos os direitos reservados.',
      'mint_now': 'Mintar Agora',
      'filters': 'Filtros',
      'protocol': 'Protocolo',
      'club': 'Clube',
      'english': 'Inglês',
      'catalan': 'Catalão',
      'chinese_simplified': 'Chinês (Simplificado)',
      'french': 'Francês',
      'german': 'Alemão',
      'hindi': 'Hindi',
      'japanese': 'Japonês',
      'korean': 'Coreano',
      'polish': 'Polonês',
      'portuguese': 'Português',
      'spanish': 'Espanhol',
      'spanish_latin_america': 'Espanhol (América Latina)',
      'malay': 'Malaio',
      'thai': 'Tailandês',
      'indonesian': 'Indonésio',
      'traditional_chinese_taiwan': 'Chinês Tradicional (Taiwan)'
    },
    es: {
      'theme': 'Tema',
      'language': 'Idioma',
      'your_personalized_digital_id': 'Tu Identidad Digital Personalizada',
      'search_for_a_name': 'Buscar un nombre',
      'connect': 'Conectar',
      'connecting': 'Conectando...',
      'my_domains': 'Mis Dominios',
      'disconnect': 'Desconectar',
      'copyright': '© 2025 vanity.box. Todos los derechos reservados.',
      'mint_now': 'Acuñar Ahora',
      'filters': 'Filtros',
      'protocol': 'Protocolo',
      'club': 'Club',
      'english': 'Inglés',
      'catalan': 'Catalán',
      'chinese_simplified': 'Chino (Simplificado)',
      'french': 'Francés',
      'german': 'Alemán',
      'hindi': 'Hindi',
      'japanese': 'Japonés',
      'korean': 'Coreano',
      'polish': 'Polaco',
      'portuguese': 'Portugués',
      'spanish': 'Español',
      'spanish_latin_america': 'Español (Latinoamérica)',
      'malay': 'Malayo',
      'thai': 'Tailandés',
      'indonesian': 'Indonesio',
      'traditional_chinese_taiwan': 'Chino Tradicional (Taiwán)'
    },
    'es-419': {
      'theme': 'Tema',
      'language': 'Idioma',
      'your_personalized_digital_id': 'Tu Identidad Digital Personalizada',
      'search_for_a_name': 'Buscar un nombre',
      'connect': 'Conectar',
      'connecting': 'Conectando...',
      'my_domains': 'Mis Dominios',
      'disconnect': 'Desconectar',
      'copyright': '© 2025 vanity.box. Todos los derechos reservados.',
      'mint_now': 'Acuñar Ahora',
      'filters': 'Filtros',
      'protocol': 'Protocolo',
      'club': 'Club',
      'english': 'Inglés',
      'catalan': 'Catalán',
      'chinese_simplified': 'Chino (Simplificado)',
      'french': 'Francés',
      'german': 'Alemán',
      'hindi': 'Hindi',
      'japanese': 'Japonés',
      'korean': 'Coreano',
      'polish': 'Polaco',
      'portuguese': 'Portugués',
      'spanish': 'Español',
      'spanish_latin_america': 'Español (Latinoamérica)',
      'malay': 'Malayo',
      'thai': 'Tailandés',
      'indonesian': 'Indonesio',
      'traditional_chinese_taiwan': 'Chino Tradicional (Taiwán)'
    },
    ms: {
      'theme': 'Tema',
      'language': 'Bahasa',
      'your_personalized_digital_id': 'Identiti Digital Peribadi Anda',
      'search_for_a_name': 'Cari nama',
      'connect': 'Sambung',
      'connecting': 'Menyambung...',
      'my_domains': 'Domain Saya',
      'disconnect': 'Putuskan sambungan',
      'copyright': '© 2025 vanity.box. Hak cipta terpelihara.',
      'mint_now': 'Mint Sekarang',
      'filters': 'Penapis',
      'protocol': 'Protokol',
      'club': 'Kelab',
      'english': 'Bahasa Inggeris',
      'catalan': 'Catalan',
      'chinese_simplified': 'Cina (Ringkas)',
      'french': 'Perancis',
      'german': 'Jerman',
      'hindi': 'Hindi',
      'japanese': 'Jepun',
      'korean': 'Korea',
      'polish': 'Poland',
      'portuguese': 'Portugis',
      'spanish': 'Sepanyol',
      'spanish_latin_america': 'Sepanyol (Amerika Latin)',
      'malay': 'Melayu',
      'thai': 'Thai',
      'indonesian': 'Indonesia',
      'traditional_chinese_taiwan': 'Cina Tradisional (Taiwan)'
    },
    th: {
      'theme': 'ธีม',
      'language': 'ภาษา',
      'your_personalized_digital_id': 'ข้อมูลประจำตัวดิจิทัลส่วนบุคคลของคุณ',
      'search_for_a_name': 'ค้นหาชื่อ',
      'connect': 'เชื่อมต่อ',
      'connecting': 'กำลังเชื่อมต่อ...',
      'my_domains': 'โดเมนของฉัน',
      'disconnect': 'ตัดการเชื่อมต่อ',
      'copyright': '© 2025 vanity.box สงวนลิขสิทธิ์',
      'mint_now': 'Mint ตอนนี้',
      'filters': 'ตัวกรอง',
      'protocol': 'โปรโตคอล',
      'club': 'คลับ',
      'english': 'อังกฤษ',
      'catalan': 'คาตาลัน',
      'chinese_simplified': 'จีน (ตัวย่อ)',
      'french': 'ฝรั่งเศส',
      'german': 'เยอรมัน',
      'hindi': 'ฮินดี',
      'japanese': 'ญี่ปุ่น',
      'korean': 'เกาหลี',
      'polish': 'โปแลนด์',
      'portuguese': 'โปรตุเกส',
      'spanish': 'สเปน',
      'spanish_latin_america': 'สเปน (ลาตินอเมริกา)',
      'malay': 'มาเลย์',
      'thai': 'ไทย',
      'indonesian': 'อินโดนีเซีย',
      'traditional_chinese_taiwan': 'จีนดั้งเดิม (ไต้หวัน)'
    },
    id: {
      'theme': 'Tema',
      'language': 'Bahasa',
      'your_personalized_digital_id': 'Identitas Digital Pribadi Anda',
      'search_for_a_name': 'Cari nama',
      'connect': 'Hubungkan',
      'connecting': 'Menghubungkan...',
      'my_domains': 'Domain Saya',
      'disconnect': 'Putuskan',
      'copyright': '© 2025 vanity.box. Hak cipta dilindungi.',
      'mint_now': 'Mint Sekarang',
      'filters': 'Filter',
      'protocol': 'Protokol',
      'club': 'Klub',
      'english': 'Bahasa Inggris',
      'catalan': 'Katalan',
      'chinese_simplified': 'Cina (Sederhana)',
      'french': 'Prancis',
      'german': 'Jerman',
      'hindi': 'Hindi',
      'japanese': 'Jepang',
      'korean': 'Korea',
      'polish': 'Polandia',
      'portuguese': 'Portugis',
      'spanish': 'Spanyol',
      'spanish_latin_america': 'Spanyol (Amerika Latin)',
      'malay': 'Melayu',
      'thai': 'Thailand',
      'indonesian': 'Indonesia',
      'traditional_chinese_taiwan': 'Cina Tradisional (Taiwan)'
    },
    'zh-TW': {
      'theme': '主題',
      'language': '語言',
      'your_personalized_digital_id': '您的個人化數位身份',
      'search_for_a_name': '搜尋名稱',
      'connect': '連接',
      'connecting': '連接中...',
      'my_domains': '我的網域',
      'disconnect': '斷開連接',
      'copyright': '© 2025 vanity.box. 版權所有。',
      'mint_now': '立即鑄造',
      'filters': '篩選器',
      'protocol': '協議',
      'club': '俱樂部',
      'english': '英語',
      'catalan': '加泰隆尼亞語',
      'chinese_simplified': '中文（簡體）',
      'french': '法語',
      'german': '德語',
      'hindi': '印地語',
      'japanese': '日語',
      'korean': '韓語',
      'polish': '波蘭語',
      'portuguese': '葡萄牙語',
      'spanish': '西班牙語',
      'spanish_latin_america': '西班牙語（拉丁美洲）',
      'malay': '馬來語',
      'thai': '泰語',
      'indonesian': '印尼語',
      'traditional_chinese_taiwan': '繁體中文（台灣）'
    }
  };

  return translations[language] || translations.en;
}