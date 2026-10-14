# Upswing Shopify Theme

Shopify-Theme für upswing.ch. Die sieben Theme-Ordner liegen direkt im Repository; das installierbare ZIP steht in den [GitHub Releases](https://github.com/sopitz/shopify-theme/releases).

## Installation

1. Im gewünschten Release **upswing-shopify-theme-VERSION.zip** herunterladen.
2. In Shopify **Onlineshop → Themes → Theme importieren → ZIP hochladen** wählen.
3. Das Theme zunächst als unveröffentlichten Entwurf öffnen und die Startseite `/` prüfen.

Bitte das benannte **Release-Asset** verwenden. GitHubs automatisch erzeugtes „Source code“-ZIP enthält zusätzlich Repository-Dateien und ist kein vorbereitetes Shopify-Installationspaket.

Im bestehenden upswing-Shop nutzt das Theme vorhandene Produkte, Varianten, Kollektionen und Menüs. Logo, Bilder, Gestaltung und bekannte Über-uns-/Filialseiten sind vorbereitet. Zusätzliche strukturierte Produktfelder sind optional. Bestehende Farbverknüpfungen in `custom_fields.custom_rel_farbe` werden ohne neue Metafelder für die Farbauswahl verwendet. Für eine vollständig nach Modellen geführte, korrekt paginierte Kollektionsliste ist weiterhin eine geprüfte Katalogzuordnung nötig; neue Seiten müssen als Shop-Ressourcen vorhanden sein. Ein leerer Testshop benötigt zunächst Shopdaten.

[Ausführliche Einrichtung und Konzept](docs/Einrichtung-und-Konzept.md) · [Änderungen je Version](CHANGELOG.md)

## Releases

Version in `config/settings_schema.json`, Changelog und Git-Tag stimmen überein. Ein Tag wie `v1.0.1` löst den Release-Ablauf aus. Nach erfolgreichen Prüfungen veröffentlicht GitHub automatisch:

- ein direkt installierbares ZIP mit ausschliesslich den sieben Theme-Ordnern;
- eine SHA-256-Prüfsumme;
- ein Manifest mit Version, Commit, Dateien und deren Prüfsummen;
- die zur Version gehörenden Änderungsnotizen.

Die ZIP-Erstellung ist reproduzierbar: dieselben Theme-Dateien ergeben dieselben ZIP-Bytes. Bereits veröffentlichte Versionen werden nicht überschrieben. Der Ablauf benötigt keine Shopify-Zugangsdaten und veröffentlicht kein Theme im Shop.

## Prüfung und lokaler Paketbau

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
python3 tools/validate_schema.py --self-test .
shopify theme check --path . --fail-level warning
python3 tools/build_release.py --tag v1.0.2
```

Die GitHub-Prüfungen verwenden die offizielle Shopify-Prüfung, zusätzliche Schema-Regeln und portable Funktionstests für Suche, bestehende Farbzuordnungen und Kaufsteuerungen. Letztere erfassen insbesondere die URL-Voreinstellungen, die bei Version 1.0.0 trotz unauffälligem Theme Check den Shopify-Upload beschädigten.

Version 1.0.1 wurde zusätzlich lokal auf erhaltene Links geprüft: 24 Section-Schemas, 21 JSON-Vorlagen, 290 gespeicherte Werte, 18 gezielte Prüffälle sowie 224 unveränderte Startseitenlinks. Diese Prüfung ersetzt keine bestätigte Shopify-Laufzeit. Der erneute Upload, Apps, Formularzustellung und echter Checkout sind im unveröffentlichten Shop-Theme zu prüfen. Der Produktberater ist im nativen Theme bislang eine statische Auswahl; die separate Designvorschau enthält einen interaktiven Ablauf.
