import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from 'next-themes';
import { LanguageSelector } from '@/components/LanguageSelector';
import { Header } from '@/components/Header';

export default function TermsOfUse() {
  const { t } = useLanguage();
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
          {t('terms_of_use')}
        </h1>
        <p className="text-sm text-muted-foreground mb-8">{t('last_modified')}: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-playfair font-semibold mb-4">1. Overview</h2>
            <ol className="list-decimal list-inside space-y-3 text-foreground/80">
              <li>
                Thank you for visiting our website at <a href="https://vanity.box/" className="text-[#D4AF37] hover:underline">https://vanity.box/</a> ("<strong>Website</strong>").
              </li>
              <li>
                <strong>By accessing and using any part of this Website or the website-hosted user interface ("<strong>Interface</strong>"), you have indicated acceptance to be legally bound by these Terms of Use. If you do not agree to these Terms of Use, your sole and exclusive remedy is to exit this Website and/or Interface (as the case may be).</strong>
              </li>
              <li>
                For the purposes of these Terms of Use, references to "<strong>Vanity.box</strong>", "<strong>we</strong>", "<strong>us</strong>" or "<strong>our</strong>" shall refer to the operators of Vanity.box. We may, from time to time, engage independent subcontractors to operate and/or maintain the Website and the Interface ("<strong>Subcontractors</strong>").
              </li>
              <li>
                These Terms of Use govern access to and use of our Website and any services provided via our Interface. You must not access or use our Website or Interface except in accordance with the Terms of Use, any applicable laws and any other notices, policies or conditions that Vanity.box may issue to the public or to you, or update on this Website, from time-to-time.
              </li>
              <li>
                These Terms of Use may be updated from time to time. All changes will be published on this page, and your use of this Website after such changes have been published will indicate your agreement to the modified Terms of Use and all of the changes. As such, you are reminded to check the Website on a regular basis to obtain the most updated version of the Terms of Use.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-playfair font-semibold mb-4">2. Services</h2>
            <ol className="list-decimal list-inside space-y-3 text-foreground/80">
              <li>
                Vanity.box provides blockchain-based domain name services, including but not limited to:
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                  <li>Subdomain registration and management</li>
                  <li>Domain name resolution</li>
                  <li>Wallet address mapping</li>
                  <li>Integration with World Chain and other blockchain networks</li>
                </ul>
              </li>
              <li>
                All services are provided on an "as is" and "as available" basis without warranties of any kind, either express or implied.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-playfair font-semibold mb-4">3. User Responsibilities</h2>
            <ol className="list-decimal list-inside space-y-3 text-foreground/80">
              <li>
                You are responsible for:
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                  <li>Maintaining the security of your wallet and private keys</li>
                  <li>All activities that occur under your account</li>
                  <li>Ensuring compliance with all applicable laws and regulations</li>
                  <li>Payment of all fees associated with domain registrations</li>
                  <li>Not using the service for any illegal or unauthorized purpose</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-playfair font-semibold mb-4">4. Domain Registration and Ownership</h2>
            <ol className="list-decimal list-inside space-y-3 text-foreground/80">
              <li>
                Domain registrations are processed on the blockchain and are subject to network fees and confirmation times.
              </li>
              <li>
                Once registered, domain ownership is recorded on the blockchain and is subject to the immutable nature of blockchain technology.
              </li>
              <li>
                You acknowledge that blockchain transactions cannot be reversed, and fees paid for registrations are non-refundable.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-playfair font-semibold mb-4">5. Intellectual Property</h2>
            <ol className="list-decimal list-inside space-y-3 text-foreground/80">
              <li>
                All intellectual property rights in the Website and Interface, including but not limited to trademarks, logos, and content, are owned by or licensed to Vanity.box.
              </li>
              <li>
                You may not use, reproduce, or distribute any content from our Website without prior written permission.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-playfair font-semibold mb-4">6. Limitation of Liability</h2>
            <ol className="list-decimal list-inside space-y-3 text-foreground/80">
              <li>
                To the fullest extent permitted by law, Vanity.box shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Website or services.
              </li>
              <li>
                We are not responsible for any losses resulting from blockchain network issues, smart contract vulnerabilities, or third-party services.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-playfair font-semibold mb-4">7. Termination</h2>
            <ol className="list-decimal list-inside space-y-3 text-foreground/80">
              <li>
                We reserve the right to terminate or suspend access to our services at any time, without prior notice, for conduct that we believe violates these Terms of Use or is harmful to other users, us, or third parties.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-playfair font-semibold mb-4">8. Governing Law</h2>
            <ol className="list-decimal list-inside space-y-3 text-foreground/80">
              <li>
                These Terms of Use shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-playfair font-semibold mb-4">9. Contact Information</h2>
            <p className="text-foreground/80">
              If you have any questions about these Terms of Use, please contact us at:{' '}
              <a href="mailto:r@vanity.box" className="text-[#D4AF37] hover:underline">
                r@vanity.box
              </a>
            </p>
          </section>
        </div>
      </main>

      {/* Fixed Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] py-4 px-4 pb-safe-area-inset-bottom">
        <div className="container mx-auto flex items-center justify-between max-w-5xl">
          <LanguageSelector />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full hover:bg-black/10 transition-colors"
            aria-label={t('toggle_theme')}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 text-black" />
            ) : (
              <Moon className="h-5 w-5 text-black" />
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}