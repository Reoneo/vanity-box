import React, { createContext, useContext, useState, useEffect } from "react";

export type Language =
  | "en"
  | "ca"
  | "zh-CN"
  | "fr"
  | "de"
  | "hi"
  | "ja"
  | "ko"
  | "pl"
  | "pt"
  | "es"
  | "es-419"
  | "ms"
  | "th"
  | "id"
  | "zh-TW";

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    // Try to get language from localStorage first
    const saved = localStorage.getItem("vanity-language");
    if (saved && isValidLanguage(saved)) {
      return saved as Language;
    }

    // Fallback to browser language detection
    const browserLang = navigator.language.toLowerCase();

    if (browserLang.startsWith("zh")) {
      return browserLang === "zh-tw" ? "zh-TW" : "zh-CN";
    }

    if (browserLang.startsWith("es")) {
      return browserLang === "es-419" ? "es-419" : "es";
    }

    if (["en", "ca", "fr", "de", "hi", "ja", "ko", "pl", "pt", "ms", "th", "id"].includes(browserLang)) {
      return browserLang as Language;
    }
  
    return "en";
  });

  useEffect(() => {
    localStorage.setItem("vanity-language", language);
  }, [language]);

  const translations: Record<Language, Record<string, string>> = {
    en: {
      register: 'Register',
      cost_breakdown: 'Cost Breakdown',
      network_fee: 'Network Fee',
      total: 'Total',
      back: 'Back',
      my_ids: 'My IDs',
      edit: 'Edit',
      registered: 'Registered',
      expires: 'Expires',
      extend: 'Extend',
      month: 'month',
      months: 'months',
      set_primary_domain: 'Set Primary Domain',
      no_domains_found: 'No domains found',
      mint_first_id: 'Mint your first ID to get started!',
    },
    ca: {
      register: 'Registrar',
      cost_breakdown: 'Desglossament de costos',
      network_fee: 'Tarifa de xarxa',
      total: 'Total',
      back: 'Tornar',
      my_ids: 'Els meus IDs',
      edit: 'Editar',
      registered: 'Registrat',
      expires: 'Expira',
      extend: 'Ampliar',
      month: 'mes',
      months: 'mesos',
      set_primary_domain: 'Establir domini principal',
      no_domains_found: 'No s\'han trobat dominis',
      mint_first_id: 'Encunya el teu primer ID per començar!',
    },
    de: {
      register: 'Registrieren',
      cost_breakdown: 'Kostenaufschlüsselung',
      network_fee: 'Netzwerkgebühr',
      total: 'Gesamt',
      back: 'Zurück',
      my_ids: 'Meine IDs',
      edit: 'Bearbeiten',
      registered: 'Registriert',
      expires: 'Läuft ab',
      extend: 'Verlängern',
      month: 'Monat',
      months: 'Monate',
      set_primary_domain: 'Primäre Domain festlegen',
      no_domains_found: 'Keine Domains gefunden',
      mint_first_id: 'Prägen Sie Ihre erste ID, um loszulegen!',
    },
    ko: {
      register: '등록',
      cost_breakdown: '비용 내역',
      network_fee: '네트워크 수수료',
      total: '합계',
      back: '뒤로',
      my_ids: '내 ID',
      edit: '편집',
      registered: '등록됨',
      expires: '만료',
      extend: '연장',
      month: '개월',
      months: '개월',
      set_primary_domain: '기본 도메인 설정',
      no_domains_found: '도메인을 찾을 수 없습니다',
      mint_first_id: '시작하려면 첫 번째 ID를 발행하세요!',
    },
    pl: {
      register: 'Zarejestruj',
      cost_breakdown: 'Podział kosztów',
      network_fee: 'Opłata sieciowa',
      total: 'Suma',
      back: 'Wstecz',
      my_ids: 'Moje ID',
      edit: 'Edytuj',
      registered: 'Zarejestrowano',
      expires: 'Wygasa',
      extend: 'Przedłuż',
      month: 'miesiąc',
      months: 'miesiące',
      set_primary_domain: 'Ustaw domenę główną',
      no_domains_found: 'Nie znaleziono domen',
      mint_first_id: 'Wybij swoje pierwsze ID, aby rozpocząć!',
    },
    pt: {
      register: 'Registrar',
      cost_breakdown: 'Detalhamento de custos',
      network_fee: 'Taxa de rede',
      total: 'Total',
      back: 'Voltar',
      my_ids: 'Meus IDs',
      edit: 'Editar',
      registered: 'Registrado',
      expires: 'Expira',
      extend: 'Estender',
      month: 'mês',
      months: 'meses',
      set_primary_domain: 'Definir domínio principal',
      no_domains_found: 'Nenhum domínio encontrado',
      mint_first_id: 'Cunhe seu primeiro ID para começar!',
    },
    es: {
      register: 'Registrar',
      cost_breakdown: 'Desglose de costos',
      network_fee: 'Tarifa de red',
      total: 'Total',
      back: 'Regresar',
      my_ids: 'Mis IDs',
      edit: 'Editar',
      registered: 'Registrado',
      expires: 'Expira',
      extend: 'Extender',
      month: 'mes',
      months: 'meses',
      set_primary_domain: 'Establecer dominio principal',
      no_domains_found: 'No se encontraron dominios',
      mint_first_id: '¡Acuña tu primer ID para comenzar!',
    },
    "es-419": {
      register: 'Registrar',
      cost_breakdown: 'Desglose de costos',
      network_fee: 'Tarifa de red',
      total: 'Total',
      back: 'Regresar',
      my_ids: 'Mis IDs',
      edit: 'Editar',
      registered: 'Registrado',
      expires: 'Expira',
      extend: 'Extender',
      month: 'mes',
      months: 'meses',
      set_primary_domain: 'Establecer dominio principal',
      no_domains_found: 'No se encontraron dominios',
      mint_first_id: '¡Acuña tu primer ID para comenzar!',
    },
    ms: {
      register: 'Daftar',
      cost_breakdown: 'Pecahan Kos',
      network_fee: 'Yuran Rangkaian',
      total: 'Jumlah',
      back: 'Kembali',
      my_ids: 'ID Saya',
      edit: 'Edit',
      registered: 'Didaftarkan',
      expires: 'Tamat',
      extend: 'Lanjutkan',
      month: 'bulan',
      months: 'bulan',
      set_primary_domain: 'Tetapkan domain utama',
      no_domains_found: 'Tiada domain dijumpai',
      mint_first_id: 'Terbitkan ID pertama anda untuk bermula!',
    },
    th: {
      register: 'ลงทะเบียน',
      cost_breakdown: 'รายละเอียดค่าใช้จ่าย',
      network_fee: 'ค่าธรรมเนียมเครือข่าย',
      total: 'รวม',
      back: 'กลับ',
      my_ids: 'ID ของฉัน',
      edit: 'แก้ไข',
      registered: 'ลงทะเบียนแล้ว',
      expires: 'หมดอายุ',
      extend: 'ขยาย',
      month: 'เดือน',
      months: 'เดือน',
      set_primary_domain: 'ตั้งโดเมนหลัก',
      no_domains_found: 'ไม่พบโดเมน',
      mint_first_id: 'สร้าง ID แรกของคุณเพื่อเริ่มต้น!',
    },
    id: {
      register: 'Daftar',
      cost_breakdown: 'Rincian Biaya',
      network_fee: 'Biaya Jaringan',
      total: 'Total',
      back: 'Kembali',
      my_ids: 'ID Saya',
      edit: 'Edit',
      registered: 'Terdaftar',
      expires: 'Kedaluwarsa',
      extend: 'Perpanjang',
      month: 'bulan',
      months: 'bulan',
      set_primary_domain: 'Atur domain utama',
      no_domains_found: 'Tidak ada domain ditemukan',
      mint_first_id: 'Cetak ID pertama Anda untuk memulai!',
    },
    "zh-TW": {
      register: '註冊',
      cost_breakdown: '成本明細',
      network_fee: '網路費用',
      total: '總計',
      back: '返回',
      my_ids: '我的ID',
      edit: '編輯',
      registered: '已註冊',
      expires: '過期',
      extend: '延長',
      month: '月',
      months: '月',
      set_primary_domain: '設定主域名',
      no_domains_found: '未找到域名',
      mint_first_id: '鑄造您的第一個ID開始吧！',
    },
    fr: {
      register: 'Enregistrer',
      cost_breakdown: 'Répartition des coûts',
      network_fee: 'Frais de réseau',
      total: 'Total',
      back: 'Retour',
      my_ids: 'Mes IDs',
      edit: 'Modifier',
      registered: 'Enregistré',
      expires: 'Expire',
      extend: 'Prolonger',
      month: 'mois',
      months: 'mois',
      set_primary_domain: 'Définir le domaine principal',
      no_domains_found: 'Aucun domaine trouvé',
      mint_first_id: 'Créez votre premier ID pour commencer!',
    },
    ja: {
      register: '登録',
      cost_breakdown: 'コスト内訳',
      network_fee: 'ネットワーク料金',
      total: '合計',
      back: '戻る',
      my_ids: 'マイID',
      edit: '編集',
      registered: '登録済み',
      expires: '期限切れ',
      extend: '延長',
      month: 'ヶ月',
      months: 'ヶ月',
      set_primary_domain: 'プライマリドメインを設定',
      no_domains_found: 'ドメインが見つかりません',
      mint_first_id: '最初のIDを作成して始めましょう！',
    },
    "zh-CN": {
      register: '注册',
      cost_breakdown: '成本明细',
      network_fee: '网络费用',
      total: '总计',
      back: '返回',
      my_ids: '我的ID',
      edit: '编辑',
      registered: '已注册',
      expires: '过期',
      extend: '延长',
      month: '月',
      months: '月',
      set_primary_domain: '设置主域名',
      no_domains_found: '未找到域名',
      mint_first_id: '铸造您的第一个ID开始吧！',
    },
    hi: {
      register: 'रजिस्टर',
      cost_breakdown: 'लागत विवरण',
      network_fee: 'नेटवर्क शुल्क',
      total: 'कुल',
      back: 'वापस',
      my_ids: 'मेरे आईडी',
      edit: 'संपादित करें',
      registered: 'पंजीकृत',
      expires: 'समाप्ति',
      extend: 'बढ़ाएं',
      month: 'महीना',
      months: 'महीने',
      set_primary_domain: 'प्राथमिक डोमेन सेट करें',
      no_domains_found: 'कोई डोमेन नहीं मिला',
      mint_first_id: 'शुरू करने के लिए अपनी पहली ID बनाएं!',
    },
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

function isValidLanguage(lang: string): lang is Language {
  return [
    "en",
    "ca",
    "zh-CN",
    "fr",
    "de",
    "hi",
    "ja",
    "ko",
    "pl",
    "pt",
    "es",
    "es-419",
    "ms",
    "th",
    "id",
    "zh-TW",
  ].includes(lang);
}
