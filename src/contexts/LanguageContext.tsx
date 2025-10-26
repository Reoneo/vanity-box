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
