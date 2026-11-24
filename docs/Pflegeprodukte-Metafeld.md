# Pflegeprodukte je Produkt

Das Produktmetafeld `upswing.care_products` bestimmt die Pflegeempfehlungen auf der Produktseite. Es wird im Theme gelesen; eine Änderung an AICO ist nicht erforderlich. Im Rahmen der Theme-Umsetzung wurde kein Shop-Metafeld angelegt oder befüllt.

| Einstellung | Wert |
|---|---|
| Ressource | Produkt |
| Anzeigename | Pflegeprodukte |
| Namespace und Schlüssel | `upswing.care_products` |
| Typ | Produktreferenz, **Liste von Produkten** (`list.product_reference`) |
| Einträge | Bis zu vier verfügbare, im Onlineshop veröffentlichte Pflegeprodukte je Produkt |

In Shopify unter **Einstellungen → Benutzerdefinierte Daten → Produkte** die Definition prüfen bzw. einmal anlegen. Anschliessend im jeweiligen Produkt unter Metafelder die passenden Produkte auswählen und in der gewünschten Reihenfolge anordnen. Die Zuordnung gehört zum Shop und gilt unabhängig vom Theme; ihre Darstellung entsteht erst durch das neue Theme.

Die gepflegte Liste ist verbindlich. Bei vorhandenem, korrekt typisiertem Feld werden keine zusätzlichen Artikel aus dem Beschreibungstext ergänzt. Selbstreferenzen, Duplikate, gelöschte bzw. nicht öffentlich verfügbare Produkte und ausverkaufte Artikel werden nicht angezeigt. Ein vorhandenes leeres Listenfeld ergibt keine Empfehlungen. Ohne gesetztes Referenzfeld verwendet das Theme weiterhin ausschliesslich bereits ausdrücklich verlinkte Produkte im Pflegeabschnitt der vorhandenen Beschreibung; es errät keine Empfehlungen anhand von Marke oder Material.

Unter der vollständigen Produktbeschreibung erscheinen Bild, Produkttitel, aktueller Preis, Produktlink und Schnellkauf. Ein einzelner regulärer Artikel lässt sich direkt hinzufügen. Bei mehreren Varianten öffnet «Schnell auswählen» eine Auswahl mit aktuellen Variantenpreisen und Mengenregeln. Ausverkaufte Varianten bleiben deaktiviert. Produkte mit verpflichtendem Abo und Produkte mit mehr als 250 Varianten werden über den Produktlink geöffnet, damit keine unvollständige Kaufkonfiguration abgeschickt wird.

Der Schnellkauf nutzt den nativen Shopify-Warenkorb. Fehler erzeugen keine automatische Wiederholung des Hinzufügens. Bei einer unklaren Netzwerkbestätigung verweist die Anzeige auf den Warenkorb, damit der Artikel nicht versehentlich doppelt hinzugefügt wird.

Vor der Veröffentlichung im unveröffentlichten Theme je ein Produkt ohne Liste, mit zwei gültigen Empfehlungen, mit mehreren Varianten und mit ausverkauften Empfehlungen prüfen. Die lokale Vorschau zeigt eine ausdrücklich gekennzeichnete Beispieldaten-Zuordnung; sie belegt keine bereits gepflegten Shop-Metafelder.
