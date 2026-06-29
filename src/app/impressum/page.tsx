"use client";

import { useT } from "@/i18n/I18nProvider";

const CONTACT = {
  name: "Julius v. Ingelheim",
  email: "julius.v.ingelheim@gmail.com",
  street: "Barthstraße 29",
  city: "80339 München",
};

export default function ImpressumPage() {
  const { t, locale } = useT();
  const de = locale === "de";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 pb-24">
      <h1 className="text-2xl font-bold">{t("legal.imprint.title")}</h1>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline">
        <section>
          <h2>{de ? "Angaben gemäß § 5 DDG" : "Information pursuant to § 5 DDG"}</h2>
          <p>
            {CONTACT.name}
            <br />
            {CONTACT.street}
            <br />
            {CONTACT.city}
            <br />
            {de ? "Deutschland" : "Germany"}
          </p>
        </section>

        <section>
          <h2>{de ? "Kontakt" : "Contact"}</h2>
          <p>
            {de ? "E-Mail" : "Email"}: <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
          </p>
        </section>

        <section>
          <h2>
            {de
              ? "Verantwortlich für den Inhalt"
              : "Responsible for content"}
          </h2>
          <p>{CONTACT.name}, {CONTACT.street}, {CONTACT.city}</p>
        </section>

        <section>
          <h2>{de ? "Haftung für Inhalte" : "Liability for content"}</h2>
          <p>
            {de
              ? "Die Inhalte dieser Seite wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der geografischen Daten kann jedoch keine Gewähr übernommen werden. GeoNerds ist ein privates, nicht-kommerzielles Hobbyprojekt."
              : "The content of this site has been created with the greatest care. However, no guarantee can be given for the accuracy, completeness and timeliness of the geographic data. GeoNerds is a private, non-commercial hobby project."}
          </p>
        </section>
      </div>
    </div>
  );
}
