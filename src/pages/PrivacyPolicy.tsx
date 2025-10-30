import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from 'next-themes';
import { LanguageSelector } from '@/components/LanguageSelector';
import { Header } from '@/components/Header';

export default function PrivacyPolicy() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted pb-20">
      <Header />
      <main className="container mx-auto px-4 py-24 max-w-4xl">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="mb-6 -ml-2 hover:bg-muted"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('back')}
        </Button>
        <h1 className="text-4xl md:text-5xl font-playfair font-bold mb-4 bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] bg-clip-text text-transparent">
          {t('privacy_policy')}
        </h1>
        <p className="text-sm text-muted-foreground mb-8">{t('last_modified')}: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
          <p className="text-sm text-muted-foreground mb-4">
            {language !== 'en' && (
              <em>Note: Legal documents are provided in English. Translations are for reference only.</em>
            )}
          </p>
          
          <section>
            <h2 className="text-2xl font-playfair font-semibold mb-4">01. Introduction</h2>
            <ol className="list-decimal list-inside space-y-3 text-foreground/80">
              <li>
                This Privacy Policy (the "<strong>Policy</strong>") sets out how Vanity.box and any of our subcontractors operating the Vanity.box websites ("<strong>Vanity.box</strong>", "<strong>we</strong>", "<strong>our</strong>" or "<strong>us</strong>") and applications which refer to this Policy, may collect, use, disclose or otherwise process your Personal Data (as defined below). In this Policy, Vanity.box websites' domain names include but are not limited to https://vanity.box/.
              </li>
              <li>
                This Policy applies to Personal Data in our possession or under our control, including Personal Data in the possession of organisations or persons that we have engaged to collect, use, disclose or process personal data for our purposes. By continuing to browse our website and use our services, you consent to our collection, use and disclosure of your Personal Data in accordance with the terms listed in this Policy.
              </li>
              <li>
                Please read this Policy carefully to understand how we will treat your Personal Data.
              </li>
              <li>
                In this Policy, "<strong>Personal Data</strong>" means data, whether true or not, about you who can be identified: (a) from that data; or (b) from that data and other information to which we have or are likely to have access.
              </li>
              <li>
                This Policy applies in conjunction with any other notices, contractual clauses and consent clauses that apply in relation to the collection, use and disclosure of your Personal Data by us.
              </li>
              <li>
                If you have any comments on, or questions about this Policy, please email them to our data protection officer at r@vanity.box.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-playfair font-semibold mb-4">02. What Personal Data We May Collect About You</h2>
            <ol className="list-decimal list-inside space-y-3 text-foreground/80">
              <li>
                We may collect Personal Data about you when you use our website, applications, or services. The types of Personal Data we may collect include:
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                  <li>Wallet addresses and blockchain transaction data</li>
                  <li>Domain names and subdomain registrations</li>
                  <li>Email addresses (if provided)</li>
                  <li>Usage data and analytics</li>
                  <li>Communication preferences</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-playfair font-semibold mb-4">03. How We Use Your Personal Data</h2>
            <ol className="list-decimal list-inside space-y-3 text-foreground/80">
              <li>
                We may use your Personal Data for the following purposes:
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                  <li>To provide and maintain our domain name services</li>
                  <li>To process your domain and subdomain registrations</li>
                  <li>To communicate with you about your account and services</li>
                  <li>To improve our website and services</li>
                  <li>To comply with legal obligations</li>
                  <li>To prevent fraud and ensure security</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-playfair font-semibold mb-4">04. Data Storage and Security</h2>
            <ol className="list-decimal list-inside space-y-3 text-foreground/80">
              <li>
                We implement appropriate technical and organizational measures to protect your Personal Data against unauthorized access, alteration, disclosure, or destruction.
              </li>
              <li>
                Blockchain data, by its nature, is publicly accessible and immutable. Please be aware that any transactions and domain registrations on the blockchain are permanent and publicly visible.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-playfair font-semibold mb-4">05. Third-Party Services</h2>
            <ol className="list-decimal list-inside space-y-3 text-foreground/80">
              <li>
                We may use third-party service providers to help us operate our website and provide our services. These providers may have access to your Personal Data only to perform specific tasks on our behalf and are obligated not to disclose or use it for any other purpose.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-playfair font-semibold mb-4">06. Your Rights</h2>
            <ol className="list-decimal list-inside space-y-3 text-foreground/80">
              <li>
                You have the right to:
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                  <li>Access your Personal Data</li>
                  <li>Correct inaccurate Personal Data</li>
                  <li>Request deletion of your Personal Data (subject to legal requirements)</li>
                  <li>Object to processing of your Personal Data</li>
                  <li>Withdraw consent where applicable</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-playfair font-semibold mb-4">07. Contact Us</h2>
            <p className="text-foreground/80">
              If you have any questions about this Privacy Policy or our data practices, please contact us at:{' '}
              <a href="mailto:r@vanity.box" className="text-[#D4AF37] hover:underline">
                r@vanity.box
              </a>
            </p>
          </section>
        </div>
      </main>

      {/* Fixed Footer */}
      <footer className="fixed bottom-0 left-0 right-0 py-1 bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] border-t-2 border-[#D4AF37] z-[9999] safe-area-inset-bottom">
        <div className="container mx-auto px-4 flex items-center justify-between text-xs">
          {/* Language Selector on Left */}
          <div className="flex items-center gap-1.5">
            <LanguageSelector />
          </div>
          
          {/* Copyright Centered */}
          <div className="text-black absolute left-1/2 transform -translate-x-1/2 font-normal whitespace-nowrap">
            © 2025 vanity.box. All rights reserved.
          </div>
          
          {/* Theme Toggle on Right */}
          <div className="flex items-center">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-7 h-7 flex items-center justify-center transition-all duration-300 hover:opacity-80"
              aria-label={t('toggle_theme')}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-black" />
              ) : (
                <Moon className="w-5 h-5 text-black" />
              )}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}