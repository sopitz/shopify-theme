# Kollektionsfilter mit vorhandenen Shopify-Daten

Das Theme gibt die Filter aus, die Shopify für die aktuelle Kollektion in `collection.filters` bereitstellt. Es baut keine Filterwerte aus Produktnamen oder Beschreibungstexten und legt keine neuen AICO-Felder an. Neue Filter benötigen eine bereits vorhandene, befüllte Datenquelle und ihre Aktivierung in Shopify Search & Discovery.

## Vorhandene Quellen auswählen

| Gewünschter Filter | Vorhandene Quelle | Voraussetzung |
|---|---|---|
| Obermaterial | Produktmetafeld `aico_metafields.obermaterial_list` | Als `list.single_line_text_field` definiert und am jeweiligen Produkt befüllt. Laut Datenprüfung ist die Definition vorhanden; leere Produkte liefern keinen entsprechenden Wert. |
| Schuhart | Produktmetafeld `aico_metafields.schuhart_list` | Ebenfalls vorhandene Textliste am Produkt. |
| Farbe | Eine tatsächlich vorhandene Produktoption, z. B. «Farbe», oder ein bereits befülltes Farb-/Kategorie-Metafeld | Die konkrete Quelle aus der Shopify-Auswahlliste nehmen. Produktkarten-Farben oder `aico.option_value_colors` erzeugen für sich allein keinen nativen Kollektionsfilter. |
| Sohle | Ein bereits vorhandenes, befülltes Produkt- oder Variantenmetafeld bzw. eine vorhandene Produktoption | Ein bestätigter Feldschlüssel liegt für upswing bislang nicht vor. «Tropo» oder «Strato» im Beschreibungstext reichen nicht. Ohne echte Filterdaten bleibt dieser Filter offen; das Theme erfindet keine Zuordnung. |
| Verfügbarkeit und Preis | Native Shopify-Standardfilter | Bestehende Konfiguration weiterverwenden. |

Eine AICO-Code-Änderung ist für die Auswahl bereits vorhandener Datenquellen nicht erforderlich. Fehlende Merkmalswerte können weiterhin nur über tatsächlich gepflegte Daten filterbar werden; das Theme leitet sie nicht aus Produktnamen, Bildern oder Freitext ab.

## Einrichtung in Search & Discovery

1. Shopify-Admin → **Apps → Search & Discovery → Filter** öffnen.
2. **Filter hinzufügen** wählen und unter **Quelle** genau die bestehende Produktoption oder Metafelddefinition auswählen. Für Material und Schuhart die oben genannten vorhandenen Produktmetafelder nehmen.
3. Verständliche Bezeichnungen vergeben und die Reihenfolge festlegen. Die Bezeichnung ändert nicht den technischen Quellschlüssel.
4. Falls Shopify eine visuelle Darstellung für diese Quelle anbietet, die bereits vorhandenen Farbfelder bzw. Bildfelder auswählen und die Darstellung als Farbfeld oder Bild aktivieren. Ein reiner Textlistenfilter kann auch als Text bleiben; es müssen keine parallelen Felder für das Theme angelegt werden.
5. Speichern und die tatsächliche Kollektion in der unveröffentlichten Theme-Vorschau öffnen. Werte und Trefferzahlen kommen dann direkt aus Shopify. Es werden nur Werte mit Bezug zu den Produkten dieser Kollektion angeboten.

Metafeldbasierte Filter setzen eine geeignete Definition voraus. Shopify unterstützt u. a. einzeiligen Text, Textlisten, Zahlen, Boolesche Werte und Metaobject-Referenzen als Quellen. Für neue visuelle Metaobject-Filter gelten zusätzliche Shopify-Anforderungen; bestehende Quellen zuerst nutzen.

## Darstellung im Theme

- `value.swatch.color` zeigt einen nativen Farbpunkt. Weiss erhält ebenso wie andere Farben einen sichtbaren Rahmen.
- `value.swatch.image` zeigt das native Musterbild; ein Musterbild hat Vorrang vor einer gleichzeitig verfügbaren Swatch-Farbe.
- `value.image` zeigt ein natives Bild für Shopifys Darstellungstyp «Bild», ohne es auf einen Kreis zuzuschneiden.
- Der vollständige `value.label` bleibt bei allen Darstellungen sichtbar. Fehlt ein natives Bild oder Farbfeld, erscheint der vorhandene Textwert ohne erfundene Ersatzfarbe.
- Checkboxen senden unverändert `value.param_name` und `value.value`. Auswahlstatus, Trefferzahl und die Abwählbarkeit bereits aktiver Werte bleiben erhalten. Nicht aktive Werte ohne Treffer sind deaktiviert. Die anklickbare Zeile ist mindestens 44 px hoch.

Das Theme nutzt für diese Filter keine Farbnamen-zu-Hexcode-Tabelle. Farben auf einer Produktkarte und eine native Filterquelle sind getrennte Datenwege.

## Prüfung mit dem echten Katalog

1. Einen vorhandenen Material- oder Farbwert wählen und **Auswahl anwenden**. Die Ergebnisliste muss zu den tatsächlichen Produktdaten passen.
2. Einen zweiten Wert ergänzen und die gewünschte UND-/ODER-Verknüpfung der Quelle in Search & Discovery kontrollieren.
3. Aktive Filter wieder abwählen, auch wenn ihre aktuelle Trefferzahl null ist. Andere Filter und die Sortierung müssen erhalten bleiben.
4. Mobil per Tastatur bzw. Touch den Filterbereich und die Werte bedienen. Sichtbare Namen bleiben auch bei fehlenden Bildern verständlich.
5. Einen Sohlenfilter erst als fertig betrachten, wenn eine echte Quelle vorliegt, sie in Search & Discovery gewählt wurde und passende Produkte den betreffenden Wert liefern.

## Offizielle Dokumentation

- [Shopify: Filterwerte (`filter_value`), einschließlich `image` und `swatch`](https://shopify.dev/docs/api/liquid/objects/filter_value)
- [Shopify: Swatch-Objekt mit Farbe und Bild](https://shopify.dev/docs/api/liquid/objects/swatch)
- [Shopify: Filter in Search & Discovery einrichten](https://help.shopify.com/en/manual/online-store/search-and-discovery/filters)
