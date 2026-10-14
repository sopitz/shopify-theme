# Changelog

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
