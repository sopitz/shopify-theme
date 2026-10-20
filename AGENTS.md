# Theme und Releases

- Dieses Repository enthält die nativen Shopify-Theme-Quellen direkt in den sieben Theme-Ordnern. Keine Vorschau-Snapshots, lokalen Arbeitsdateien, Zugangsdaten oder generierten ZIPs committen.
- Bestehende Gestaltung, Original-Logo und Font-Lizenz erhalten. Die Shopify-Produktdaten und bereits gesetzten Editor-Einstellungen respektieren.
- Vor einem Release `python3 tools/validate_schema.py --self-test .`, den offiziellen Shopify Theme Check und passende Funktionsprüfungen ausführen.
- Version in `config/settings_schema.json`, `package.json` und `CHANGELOG.md` gemeinsam ändern. Abgeschlossene Theme-Releases erhalten einen passenden SemVer-Tag `vX.Y.Z`; der GitHub-Ablauf erstellt das Installationspaket und den Release.
- Veröffentlichten Tags und Release-Assets keine geänderten Inhalte unterschieben. Korrekturen erhalten eine neue Version.
- Lokale Prüfung und bestätigte Shopify-Laufzeit klar unterscheiden. Keine automatische Veröffentlichung eines Themes im Shop.

- Feste Nutzerpräferenz: Niemals eigenständig ein Shopify-Theme live schalten. Theme-Veröffentlichungen erfolgen ausschliesslich als GitHub-Release; die Aktivierung im Shopify-Shop übernimmt der Nutzer selbst.
