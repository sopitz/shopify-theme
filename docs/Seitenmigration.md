# Bestehende Shopify-Seiten im neuen Theme

Die Migration liegt ausschließlich im Theme. Bestehende Page-IDs, Handles, URLs,
SEO-Daten, Seiteninhalte und Vorlagenzuordnungen werden nicht geändert. Die
öffentliche Bestandsaufnahme vom 24. November 2026 enthält 41 Seiten mit leerem
nativem Seiteninhalt. Die bisher sichtbaren Inhalte stammen daher aus dem
bisherigen Theme und werden als getrennte Seitenfamilien übernommen.

## Auswahl des Inhalts

`page-migration-family` erlaubt nur die ausdrücklich erfassten Handles. Ein
gefüllter nativer Seiteninhalt hat Vorrang vor den neuen Familien. Unbekannte
Handles erhalten keinen fremden Ersatzinhalt.

`main-page` und `main-about-page` respektieren zusätzlich einen ausdrücklich
gewählten Editor-Ersatz, vorhandene Editor-Blöcke oder konfigurierte
Überschrift/Einleitung/Bild/Dachzeile. Dieser Aufbau wird statt der Migration
gerendert. Ein bloßer Inhaltsquellenwert `page` bei leerem Seiteninhalt verhindert
den Ersatz nicht. Die zehn bereits vorhandenen kuratierten Live-Seiten behalten
ihren bisherigen Designpfad.

Die vorhandenen B2B-, Kontakt-, Guide- und Buchungssektionen prüfen zuerst den
Handle. So erhält eine Seite mit einer vorhandenen Spezialvorlage keinen
inhaltlich fremden Standardbereich. Die Kontaktseite verwendet weiterhin das
native Shopify-Kontaktformular, einschließlich eindeutiger Feld- und Fehler-IDs.

Die zusätzlichen Produkt- und Beratungssektionen in `page.kybun`, `page.marke`
und `page.thema` sind bei migriertem, leerem Seiteninhalt ausgeblendet. Die
Familien enthalten diese Bereiche bereits selbst. Bei gefülltem Seiteninhalt
bleiben die bisherigen Zusatzsektionen erhalten. Wer einen eigenen Editor-Aufbau
erstellt, kann **Bei migriertem Seiteninhalt ausblenden** an diesen Zusatzsektionen
deaktivieren; die Einstellung gehört nur zu diesem Theme.

## Zuständigkeiten und Handles

| Quelle | Handles |
|---|---|
| `migrated-brand-pages` | anders, bellabambi, bellicon, blackroll, elten, joya, kingnature, kybun, leguano, pepup, theraband, venenengel |
| `migrated-topic-hub-pages` | arthrose-und-gelenkschmerzen, fersensporn-und-andere-fussschmerzen, regeneration-im-schlaf, ruckenschmerzen, aktionen, arbeitsplatz, gesundheitsschuhe, themen, trainingsgeraete, vitalitaet |
| `migrated-service-pages` | b2b, medical-partner-werden, bellicon-beratung-buchen, blackroll-base-beratung-buchen, venen-engel-beratung-buchen, bellicon-training-ruti-zh, sypoba-training-in-thun, contact, versandinformationen |
| Vorhandenes `about-page-content` | filialubersicht, geschichte, offene-stellen, premium-service, upswing-werte, standort-basel, standort-ruti-zh, standort-thun, standort-winterthur, standort-zurich |

Der vorhandene zusätzliche Design-Handle `ueber-uns` bleibt ebenfalls unterstützt,
ist jedoch nicht Teil der aktuellen öffentlichen 41-Seiten-Bestandsaufnahme.

Die 16 vorhandenen Seitenvorlagen bleiben verfügbar: Standard, about, b2b,
beratung, careers, contact, guide, history, kybun, location, locations, marke,
premium-service, termine, thema und values. Die tatsächlichen bestehenden
Suffixzuordnungen sind in der öffentlichen Page-Antwort nicht enthalten und
müssen in der unveröffentlichten Theme-Vorschau geprüft werden. Ein Dateiname
weist einer Page keine Vorlage zu. Fehlende Alt-Suffixe müssen vor dem Wechsel
als kompatible Vorlagendateien ergänzt werden; nicht allein für einen Entwurf
die globale Page-Zuordnung ändern.

## Gemeinsame Darstellung

Die Familien-Snippets liefern den gesamten Seiteninhalt mit `.migrated-page`.
Nicht unterstützte Handles liefern eine leere Ausgabe. Gemeinsame Klassen:

- `.migration-container`, `.migration-hero` und `--text`, `.migration-copy`,
  `.migration-media`, `.migration-eyebrow`, `.migration-lead`.
- `.migration-section`, `.migration-section-heading`, `.migration-story`.
- `.migration-grid` und `--two`, `.migration-card`, `.migration-card-media`,
  `.migration-actions`, `.migration-benefits`, `.migration-benefit`.
- `.migration-faq`/`.migration-faq-list`, `.migration-products`,
  `.migration-trust`, `.migration-locations`.

Produktkarten verwenden zusätzlich das native `.product-grid` und
`product-card`, damit gemeinsame Zeilenhöhen, aktuelle Preise und Varianten
erhalten bleiben. Bilder behalten ihre natürlichen Proportionen. Das gemeinsame
Stylesheet `page-migration.css` wird nur auf Shopify-Page-Routen geladen.

## Freigabe

Vor Veröffentlichung jede der 41 bestehenden URLs im unveröffentlichten Theme
gegen die Liveaufnahme prüfen: Texte, Bilder, Links, Katalogauswahl, Formulare,
Buchungen, Einbettungen und mobile Darstellung. Die lokale Vorschau stellt
Shop-Daten als gekennzeichnete Fixtures dar und ersetzt die Shopify-Prüfung
nicht. Das bisherige Theme für einen Rückwechsel aufbewahren.
