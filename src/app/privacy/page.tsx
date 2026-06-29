"use client";

import { useT } from "@/i18n/I18nProvider";

const CONTACT = {
  name: "Julius v. Ingelheim",
  email: "julius.v.ingelheim@gmail.com",
  street: "Barthstraße 29",
  city: "80339 München",
};

export default function PrivacyPage() {
  const { t, locale } = useT();
  const de = locale === "de";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 pb-24">
      <h1 className="text-2xl font-bold">{t("legal.privacy.title")}</h1>
      <p className="mt-1 text-xs text-muted-foreground">{t("legal.lastUpdated")}</p>

      <div className="prose-legal mt-6 space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline">
        {de ? (
          <>
            <section>
              <h2>1. Verantwortlicher</h2>
              <p>
                {CONTACT.name}
                <br />
                {CONTACT.street}, {CONTACT.city}
                <br />
                E-Mail: <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
              </p>
            </section>
            <section>
              <h2>2. Überblick</h2>
              <p>
                GeoNerds ist ein kostenloses Geografie-Spiel. Wir legen Wert auf Datensparsamkeit: Es
                gibt keine Werbung, kein Tracking und keine Analyse-Cookies. Die meisten Daten bleiben
                ausschließlich auf deinem Gerät.
              </p>
            </section>
            <section>
              <h2>3. Lokale Speicherung (Local Storage)</h2>
              <p>
                Deine Einstellungen (Sprache, Ton, Theme), dein Spielfortschritt, deine Punkte und
                Abzeichen werden im lokalen Speicher deines Browsers abgelegt. Diese Daten verlassen
                dein Gerät nicht und werden nicht an uns übertragen. Du kannst sie jederzeit über die
                Einstellungen oder durch Leeren des Browser-Speichers löschen.
              </p>
            </section>
            <section>
              <h2>4. Optionales Konto & Bestenliste</h2>
              <p>
                Nur wenn du dich freiwillig anmeldest, speichern wir den von dir gewählten Namen, einen
                verschlüsselten Zugangscode sowie deine eingereichten Spielergebnisse auf unserem
                Server, um die globale Bestenliste anzuzeigen. Gib bitte keinen Klarnamen an, wenn du
                anonym bleiben möchtest. Du kannst die Löschung deines Kontos jederzeit per E-Mail
                anfragen.
              </p>
            </section>
            <section>
              <h2>5. Hosting</h2>
              <p>
                Die Seite wird bei Vercel Inc. (USA) gehostet. Beim Aufruf verarbeitet der Server
                technisch notwendige Zugriffsdaten (z. B. IP-Adresse, Zeitpunkt, abgerufene Seite) zur
                Auslieferung und Sicherheit. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO
                (berechtigtes Interesse an einem sicheren Betrieb).
              </p>
            </section>
            <section>
              <h2>6. Schriftarten</h2>
              <p>
                Schriftarten werden lokal von unserem Server geladen (self-hosted). Es werden{" "}
                <strong>keine</strong> Anfragen an Google Fonts oder andere Dritte gestellt.
              </p>
            </section>
            <section>
              <h2>7. Deine Rechte</h2>
              <p>
                Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
                Datenübertragbarkeit und Widerspruch sowie ein Beschwerderecht bei einer
                Aufsichtsbehörde. Wende dich dafür an{" "}
                <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
              </p>
            </section>
          </>
        ) : (
          <>
            <section>
              <h2>1. Controller</h2>
              <p>
                {CONTACT.name}
                <br />
                {CONTACT.street}, {CONTACT.city}
                <br />
                Email: <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
              </p>
            </section>
            <section>
              <h2>2. Overview</h2>
              <p>
                GeoNerds is a free geography game. We keep data collection to a minimum: there are no
                ads, no tracking and no analytics cookies. Most data stays only on your device.
              </p>
            </section>
            <section>
              <h2>3. Local storage</h2>
              <p>
                Your settings (language, sound, theme), game progress, scores and badges are stored in
                your browser&apos;s local storage. This data never leaves your device and is not sent to
                us. You can clear it at any time from the settings page or by clearing your browser
                storage.
              </p>
            </section>
            <section>
              <h2>4. Optional account &amp; leaderboard</h2>
              <p>
                Only if you voluntarily sign in do we store your chosen name, a hashed passcode and the
                game results you submit on our server in order to show the global leaderboard. Please
                don&apos;t use your real name if you wish to stay anonymous. You may request deletion of
                your account at any time by email.
              </p>
            </section>
            <section>
              <h2>5. Hosting</h2>
              <p>
                The site is hosted by Vercel Inc. (USA). When you visit, the server processes
                technically necessary access data (e.g. IP address, time, requested page) for delivery
                and security. The legal basis is Art. 6(1)(f) GDPR (legitimate interest in secure
                operation).
              </p>
            </section>
            <section>
              <h2>6. Fonts</h2>
              <p>
                Fonts are served locally from our own server (self-hosted). <strong>No</strong> requests
                are made to Google Fonts or other third parties.
              </p>
            </section>
            <section>
              <h2>7. Your rights</h2>
              <p>
                You have the right to access, rectification, erasure, restriction of processing, data
                portability and objection, as well as the right to lodge a complaint with a supervisory
                authority. To exercise these rights, contact{" "}
                <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
