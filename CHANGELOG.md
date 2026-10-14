# Changelog

## [1.0.2] - 2026-10-14

### Suche

- Native Shopify-Suchvorschläge in Header und mobilem Menü ergänzt: Produktbilder, Preise, Suchbegriffe, Sortiments- und Informationsseiten.
- Tastatursteuerung, verzögerte Anfragen, Abbruch veralteter Antworten und normale Suche bei Fehlern oder ohne JavaScript erhalten.

### Bestehende Farbdaten

- `custom_fields.custom_rel_farbe` direkt als zusätzliche Quelle für die Farbauswahl integriert. JSON-Objekte und ältere JSON-Textfelder benötigen dafür keine Migration.
- Native Farboptionen und `upswing.model_products` behalten Vorrang. Nur vorhandene Produktziele werden angezeigt; leere oder veraltete Sprach-Handles werden geprüft.
- Farbwahl funktioniert auf der Produktseite, in Karten, Kaufleiste und Vollbild. Nachgeladene Farben erhalten die gewählte Grösse und Menge und schliessen eine offene Bildansicht nicht.
- Karten laden die Farbreferenzen erst nahe dem sichtbaren Bereich, mit gemeinsamem Cache und begrenzten parallelen Anfragen.

### Gestaltung

- Übermässige Zwischenräume innerhalb der Produktkarten entfernt, auch im spezifischen Kollektionsraster. Preise und Links bleiben pro Zeile bündig, die Bedienelemente gut erreichbar.
- Der erste Produktbeschreibungsabsatz wird vollständig angezeigt statt mitten im Satz abgeschnitten.
- Der Beratungslink unter den Produktbildern führt direkt zur Filialauswahl.

### Prüfung und Installation

Die Funktionen wurden mit Offline-Regressionen sowie nativen Liquid-Vorschauen auf Desktop und Mobile geprüft. Aarau blue/black wurden öffentlich abgeglichen; die Metafield-Zuordnung stammt aus dem bereitgestellten Datenbeispiel. Shopify-Suche, Metafields und echter Checkout sind nach Upload im Shop abschliessend zu prüfen. Das Asset **upswing-shopify-theme-1.0.2.zip** als unveröffentlichten Theme-Entwurf installieren.

## [1.0.1] - 2026-10-14

### Korrigiert

- 13 unzulässige URL-Voreinstellungen in acht Section-Schemas entfernt. Sie verhinderten unter anderem das Laden von Kopf- und Fussbereich in Shopify.
- Bestehende Linkziele durch gespeicherte Einstellungen und Liquid-Fallbacks erhalten; die Links müssen nicht erneut eingerichtet werden.
- Kontakt- und Über-uns-Ziele bleiben auch bei noch leeren Header-Einstellungen erreichbar.

### Release und Prüfung

- Theme-Quellen, Changelog und installierbare Pakete werden über dieses Repository versioniert.
- Zusätzliche Schema-Prüfung ergänzt den offiziellen Shopify Theme Check.
- Versionierte ZIPs, SHA-256-Prüfsummen und Dateimanifeste werden nach erfolgreichen Prüfungen automatisch veröffentlicht.
- Lokal geprüft: 24 Section-Schemas, 21 JSON-Vorlagen, 290 gespeicherte Werte, 18 gezielte Prüffälle und unveränderte Links im lokalen Rendering.

### Installation

Das Asset **upswing-shopify-theme-1.0.1.zip** als neuen, unveröffentlichten Theme-Entwurf hochladen. Der tatsächliche erneute Shopify-Upload und Betrieb im Shop sind noch nicht abschliessend bestätigt. Die auf dem Fehlerscreenshot zusätzlich sichtbare 404 unter `/en` betrifft eine separat zu prüfende Sprachroute.
