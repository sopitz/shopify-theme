# Venen Engel: Datenbindung und geprüfte Grenzen

Stand: 24. November 2026. Die bestehende Produktauswahl von `/pages/venenengel` wurde in native Theme-Dateien übertragen. Das ist eine Produktauswahl mit Grössenhinweisen; sie ersetzt keine persönliche oder ärztliche Beratung.

## Aktuelle Shopify-Daten

Unter **Theme-Einstellungen → Venen Engel Produktfinder** lässt sich die vollständige Kollektion mit Geräten und Zubehör auswählen. `snippets/venen-engel-configurator.liquid` liest diese themeeigene Auswahl aus `settings.venen_engel_collection`; eine ausdrücklich übergebene sektionsbezogene Auswahl hat Vorrang. Ohne Auswahl verwendet die Migration die nachgeprüfte Kollektion `venen-engel-222`. Die ebenfalls vorhandene Kollektion `venen-engel-193` enthält überwiegend Geräte und reicht für Zubehör und Strümpfe nicht aus.

Die öffentliche Prüfung von `venen-engel-222` ergab 47 Produkte mit 69 Varianten, davon 66 verfügbar. Alle 21 bereits zugeordneten Geräte-/Zubehör-SKUs des bisherigen Finders waren enthalten, ebenso die zugeordneten Strumpfvarianten. Diese Zahlen beschreiben den Prüfzeitpunkt und stehen nicht als Produktkatalog im Theme.

IDs, Preise, Vergleichspreise, Währung, Bilder, Produkttitel und Verfügbarkeit kommen bei jedem Seitenaufruf aus den tatsächlichen Shopify-Produkten und -Varianten. Nur die fachlichen Produktrollen werden über die vorhandenen SKUs zugeordnet. Es gibt keine übernommenen Bestandswerte, Preise oder Varianten-IDs aus dem alten HTML. Bei mehr als 250 Produkten verhindert die unvollständige Katalogbindung die Bestellung. Doppelte SKUs mit unterschiedlichen Varianten-IDs werden nicht willkürlich aufgelöst.

## Modellbezogene Oberschenkelgrenzen

Die Angaben sind Richtwerte der jeweiligen Quelle. Dezimalmasse werden beim Prüfen der Kapazität nicht abgerundet. Ein allgemeiner Grenzwert von 70 cm gilt ausdrücklich nicht für jedes Modell.

| Geräte-SKU | Modell | Geprüfter Richtwert ohne Erweiterung | Quelle |
| --- | --- | --- | --- |
| `202976` | Mini mit Beinmanschette, VE-330 | ca. 67 cm | [Aktuelle Shopify-Produktbeschreibung](https://upswing.ch/products/venen-engel-mini-mit-beinmanschette) |
| `204397` | 6 Premium mit Beinmanschetten, VE-352 | ca. 70 cm | [Technische Angaben des Herstellers zum Modell VE-352](https://venenengel.de/products/venen-engel-6-premium-massagegerat-beinmanschette) |
| `204399` | 8 Premium mit Beinmanschetten NC, VE-354 | ca. 70 cm | [Aktuelle Shopify-Produktbeschreibung](https://upswing.ch/products/product-2455) |
| `202990` | Plus mit Lymph-Flow Pants, VE-331 | ca. 74 cm | [Shopify-Produktbeschreibung](https://upswing.ch/products/venen-engel-plus-mit-lymph-flow-pants) und [technische Angaben des Herstellers](https://venenengel.de/products/venen-engel-plus) |
| `203318` | Pro mit Lymph-Flow Pants, VE-349 | ca. 78 cm | [Shopify-Produktbeschreibung](https://upswing.ch/products/product-2340) und [technische Angaben des Herstellers](https://venenengel.de/products/venen-engel-pro) |

Für die neuen Premium-Pants, SKUs `204398` und `204395`, bleibt die bestehende zweidimensionale Matrix für Bauch/Hüfte und Oberschenkel erhalten, einschliesslich Flex Fit `204401`, Comfort Fit `204402` und Classic Fit `204403`. Der Standardbereich dieser Matrix beträgt 122/74 cm. Die Modellzuordnung entspricht den neuen Pants; der [Hersteller führt den Massrechner am aktuellen 6-Premium-Modell VE-356](https://venenengel.de/products/venen-engel-6-premium-lymph-flow-pants). Die Kombinationskapazitäten stammen aus dem bisherigen Shop-Konfigurator, nicht aus einer neu erfundenen Berechnung. Die Shopify-Beschreibungen der drei Laschen beschränken sie auf die neuen Pants mit durchgehendem Reissverschluss; sie gelten nicht für ältere Multi-Zipper-Pants oder pauschal für Plus/Pro.

## Unbestätigte Zuordnungen

| Fall | Verhalten |
| --- | --- |
| Plus/Pro: Bauch-/Hüftgrenze nicht am exakten Geräte-SKU bestätigt | Keine vollständige Passformbestätigung und keine Bestellung aus dem gemessenen Ergebnis. Persönliche Beratung oder ausdrückliche Auswahl des Grundgeräts ohne Passformprüfung. |
| Pro benötigt eine Erweiterung | Kein automatischer Ersatz durch Plus-Zubehör. Das gemessene Paket bleibt gesperrt. |
| Pro mit Armmanschette | Gesperrt: Adapter-SKU `202449` nennt im aktuellen Shop ausdrücklich den 12 Premium und schliesst andere Modelle aus. Der Pro wird nicht als identisch behandelt. |
| Mini mit Bein- und Bauchmanschette, SKU `203321` / VE-343 | Exakte Masszuordnung nicht bestätigt. Gemessene Konfiguration bleibt gesperrt; Beratung und echte Produktseite bleiben erreichbar. Daten älterer Outlet-Sets oder separater Bauchmanschetten werden nicht auf dieses Set übertragen. |
| Premium-Bein-Erweiterung, Mini-Bauch-Erweiterung oder Beauty-Zusatzarm ohne bestätigte SKU-Zuordnung | Kein erfundener Ersatzartikel. Betroffene Ausführung ist nicht als vollständiges Online-Paket bestellbar. |
| Fehlender oder ausverkaufter Bestandteil | Das gesamte gewählte Paket bleibt gesperrt; keine stille Teilbestellung. Andere verfügbare Ausführungen bleiben wählbar. |

Die Funktion „Ohne Passformprüfung wählen – Masse später prüfen“ ist eine bewusste Auswahl des Grundgeräts. Sie bestätigt keine Weite und fügt keine berechneten Erweiterungen hinzu. Bereits eingegebene Masse ausserhalb des bekannten Standardbereichs lassen sich damit nicht umgehen. Pro/Arm-Kompatibilität und fehlende Pflichtbestandteile bleiben auch in diesem Modus gesperrt. Der Warenkorb erhält einen entsprechenden privaten Hinweis zur fehlenden Passformprüfung. Alternativ verlinkt das Ergebnis auf die tatsächlich gebundene Produktvariante.

Kompressionsstrümpfe benötigen eine ausdrücklich gewählte verfügbare Grösse oder eine passende Berechnung. Widersprüchliche, unvollständige oder nicht erhältliche Ergebnisse aus eingegebenen Strumpfmassen sperren das Paket. „Massangaben zurücksetzen und Grösse selbst wählen“ entfernt die Messwerte sichtbar und erhält die manuelle Grössenwahl.

## Warenkorb und Prüfung

Eine Bestellung verwendet genau einen gebündelten, sprachabhängigen `cart/add.js`-Aufruf mit aktuellen Varianten-IDs. Es gibt keine automatischen Einzel-Wiederholungen. Bei einer abgelehnten oder unklar beantworteten Anfrage bleibt erneutes Absenden gesperrt und der Hinweis zum Prüfen des Warenkorbs sichtbar, auch nach einem Wechsel der Frage oder erneuter Ergebnisanzeige. Bei Erfolg führt die normale Shopfunktion zum lokalisierten Warenkorb. Der Finder enthält keine übernommenen Analytics-Aufrufe.

Automatisierte Tests prüfen unter anderem Modellgrenzen, Dezimalgrenzen, Zubehörzuordnung, Strumpfmasse, fehlende/ausverkaufte/doppelte SKUs, aktuelle Marktpreise in Ganzzahl-Cents, CHF-Formatierung, Lokalisierung, genau einen Warenkorb-Aufruf und dauerhafte Fehlermeldungen. Die zusätzlichen Abläufe mit dem vollständig gelesenen aktuellen Katalog laufen ausschliesslich lokal; echte Warenkorb- und Terminbuchungen gehören nicht zur Prüfung.
