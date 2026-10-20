# Upswing Shopify Theme

Native Shopify-Theme-Quellen für upswing.ch, Stand **1.0.15**. Die sieben Theme-Ordner liegen direkt im Repository. Installationspakete freigegebener Versionen stehen in den [GitHub Releases](https://github.com/sopitz/shopify-theme/releases).

Der Produktkatalog wird im Shopify-Shop gepflegt: Produkte, Varianten, Kollektionen, Menüs, Preise, Bilder und Produktinformationen kommen aus den tatsächlichen Shop-Ressourcen. Die ausgelieferten Produkt- und Kollektionsauswahlen enthalten keine vorbereiteten Handles. Wählen Sie die gewünschten Ressourcen im Theme-Editor und ordnen Sie die Shop-Menüs zu. Nicht verknüpfte Katalogkarten bleiben im Shop verborgen; im Editor helfen Einrichtungshinweise.

Die Gestaltung, das Original-Logo, Manrope mit Lizenz sowie die vorhandenen redaktionellen Über-uns- und Filialinhalte bleiben erhalten. Die separate Designvorschau verwendet gekennzeichnete Momentaufnahmen und ist kein Nachweis für aktuelle Shopdaten oder einen funktionierenden Checkout.

## Installation und Einrichtung

1. Das benannte Release-Asset **upswing-shopify-theme-VERSION.zip** herunterladen. GitHubs automatisch erzeugtes „Source code“-ZIP ist kein vorbereitetes Shopify-Installationspaket.
2. In Shopify **Onlineshop → Themes → Theme importieren → ZIP hochladen** wählen und das Theme als **unveröffentlichten Entwurf** öffnen.
3. Die [Katalog-Checkliste](docs/Katalog-Einrichtung.html) abarbeiten: Menüs zuordnen, echte Seiten und Kollektionen auswählen, Produkte verknüpfen sowie Shop-Richtlinien und benötigte Zusatzfelder pflegen.
4. Mit dem echten Katalog im Entwurf Navigation, Produkt- und Kollektionsseiten, Varianten, Warenkorb, Formularzustellung und Checkout prüfen. Die Veröffentlichung erfolgt anschliessend bewusst im Shopify-Admin.

Ein Theme-Upload legt keine Produkte, Kollektionen, Seiten, Metafelddefinitionen oder Metaobjects an und verändert keine Katalogdaten. Ein leerer Testshop braucht zuerst passende Shop-Ressourcen.

[Einrichtung und Konzept](docs/Einrichtung-und-Konzept.md) · [Katalog-Checkliste als Text](docs/Katalog-Einrichtung.txt) · [Datenübersicht](docs/Shopdaten.txt) · [AICO-Zusatzfelder für vier Hauptkategorien](docs/AICO-Zusatzfelder-Hauptkategorien.html) · [Änderungen je Version](CHANGELOG.md)

## Datenpflege

Sortimentskarten übernehmen Titel, Ziel, Beschreibung und Bild der ausgewählten Kollektion. Marken verweisen ebenfalls auf echte Kollektionen; ein Bild kann über das optionale Kollektionsmetafeld `upswing.brand_logo` gepflegt werden. Themenkarten verknüpfen eine echte Seite oder Kollektion. Der Produktberater verwendet ausgewählte Kollektionen.

Produktinformationen stammen aus der nativen Beschreibung, vorhandenen AICO-Feldern und optionalen `upswing`-Metafeldern. Versand- und Rückgabebedingungen kommen aus den Shopify-Richtlinien. Lieferfristen stammen ausschliesslich aus `upswing.delivery_time` der Variante oder des Produkts; ohne Frist bleibt die Lieferzeit auf Anfrage. Mehrfarbige Produkte teilen den Farbpunkt in bis zu vier gleiche Segmente, wenn AICO alle Farbwerte als `aico.pd_colors_hex` (Liste, Hauptfarbe zuerst) liefert. Exakte Einzelfarbwerte kommen zuerst aus dem bereits vorhandenen `aico.pd_color_hex`, danach aus einem bestehenden `upswing.color_hex` und anschliessend aus dem nativen ausgewählten Shopify-Swatch. Ein neues paralleles Farbfeld ist nicht erforderlich. Ohne bestätigten Farbwert bleibt die Farbe als Text wählbar; aus Farbnamen werden keine Farbtöne geschätzt.

## Prüfung und lokaler Paketbau

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
python3 tools/validate_schema.py --self-test .
shopify theme check --path . --fail-level warning
python3 tools/build_release.py --tag v1.0.15
```

Die lokalen Prüfungen kontrollieren unter anderem Ressourcenbindung, leere und gelöschte Referenzen, Produktinformationen, Farbauswahl, Lieferzeit und Kaufsteuerungen. Die tatsächliche Shopify-Laufzeit mit Shop-Apps, Beständen, Formularzustellung, Versandberechnung, Zahlungsarten und Checkout muss im unveröffentlichten Theme geprüft werden.

## Releases

Version in `config/settings_schema.json`, `package.json`, Changelog und Git-Tag gemeinsam pflegen. Ein freigegebener SemVer-Tag startet den GitHub-Release-Ablauf. Dieser prüft das Theme und erstellt ein installierbares ZIP mit den sieben Theme-Ordnern, eine SHA-256-Prüfsumme, ein Dateimanifest und die Änderungsnotizen. Gleiche Theme-Dateien ergeben dieselben ZIP-Bytes. Veröffentlichte Versionen werden nicht überschrieben. Der Ablauf veröffentlicht kein Theme im Shopify-Shop.
