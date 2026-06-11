# Savegame format

An example can be found here: [sampleSavegame.json](./sampleSavegame.json)

Savegames are JSON files. Savegames are exported by the application as a ZIP with all saved games.

Keep in mind this format could change in future.

The structure:

```javascript
{
    // Current savegame state
    "currentState": {
        // Current Action Chart state (full documentation at actionChart.ts)
        "actionChart": {
            // Original values:
            "combatSkill": 18,
            "endurance": 26,
            // Current value:
            "currentEndurance": 26,
            // Owned weapons. Since v1.12, these are ActionChartItem objects.
            // In v1.11 and earlier, these were plain strings.
            "weapons": [
                { "id": "sword", "usageCount": 1, "damage": 0 },
                { "id": "bow", "usageCount": 1, "damage": 0 }
            ],
            // Current selected weapon
            "fightUnarmed": false,
            "selectedWeapon": "sword",
            // Money. Since v1.18, multicurrency support.
            // In v1.17 and earlier, this was a single number (Gold Crowns).
            "beltPouch": {
                "crown": 31,
                "noble": 0,
                "lune": 0,
                "kika": 0,
                "ren": 0,
                "sheasutorq": 0,
                "orla": 0,
                "ain": 0
            },
            // Number of meals (each one backpack item)
            "meals": 3,
            // Backpack items. Since v1.12, these are ActionChartItem objects.
            // In v1.11 and earlier, these were plain strings.
            "backpackItems": [
                { "id": "rope", "usageCount": 1 },
                { "id": "khetuspores", "usageCount": 1 },
                { "id": "baylonboughfungi", "usageCount": 1 },
                { "id": "silverflask", "usageCount": 1 },
                { "id": "silverflask", "usageCount": 1 }
            ],
            // Special items. Since v1.12, these are ActionChartItem objects.
            // In v1.11 and earlier, these were plain strings.
            "specialItems": [
                { "id": "quiver", "usageCount": 1 },
                { "id": "quiver", "usageCount": 1 },
                { "id": "map", "usageCount": 1 },
                { "id": "crystalexplosive", "usageCount": 1 },
                { "id": "goldenamulet", "usageCount": 1 }
            ],
            // Backpack lost?
            "hasBackpack": true,
            // Current Kai disciplines. These are the codes as they appear in the books XML. Descriptions can be found in README-mechanics.md
            "disciplines": [
                "wpnmstry",
                "curing",
                "hntmstry",
                "dvnation"
            ],
            // Weapon codes for Weaponskill. Weapons information can be found in objects.xml
            "weaponSkill": [
                "bow",
                "sword",
                "dagger",
                "broadsword",
                "spear"
            ],
            // Action Chart annotations field
            "annotations": "These are my personal annotations",
            "manualRandomTable": true,
            "extendedCRT": false,
            "yScrollPosition": 0,
            // Number of arrows in owned quivers
            "arrows": 9,
            // Number of fireseeds (added in v1.15)
            "fireseeds": 0,
            // Adgana has ever been used?
            "adganaUsed": false,
            // Curing (+20EP) has been used in current book?
            "restore20EPUsed": false,
            // New Order Curing EP restored in current book (added in v1.16)
            "newOrderCuringEPRestored": 0,
            // Disciplines per series (added in v1.12). Previous versions stored only
            // 'disciplines' and 'weaponSkill' for the current series.
            "kaiDisciplines": { "disciplines": [], "weaponSkill": [] },
            "magnakaiDisciplines": { "disciplines": [], "weaponSkill": [] },
            "grandMasterDisciplines": { "disciplines": [], "weaponSkill": [] },
            "newOrderDisciplines": { "disciplines": [], "weaponSkill": [] },
            // Objects stored in Kai monastery
            "kaiMonasterySafekeeping": [
                {
                    // Object id
                    "id": "money",
                    // Unused here
                    "price": 0,
                    // Unused here
                    "unlimited": false,
                    // Amount: Only for quivers (=number of arrows) and money
                    "count": 2,
                    "useOnSection": false
                },
                {
                    "id": "quiver",
                    "price": 0,
                    "unlimited": false,
                    "count": 3,
                    "useOnSection": false
                },
                {
                    "id": "lantern",
                    "price": 0,
                    "unlimited": false,
                    "count": 0,
                    "useOnSection": false
                }
            ],
            // List of player tags
            "tags": ["crystalstar"]
        },
        // Current book number
        "bookNumber": 12,

        // Current book sections state (bookSectionStates.ts for full documentation)
        "sectionStates": {
            "currentSection": "equipmnt",

            // ...
            // Here the is one object for each visited section. Key is the section id as it appears in the XML, and the value
            // is the state
            "tssf": {
                    // See sectionState.ts for details
                    "objects": [],
                    "sellPrices": [],
                    "combats": [],
                    "combatEluded": false,
                    "executedRules": {
                        "endurance[count='+[MAXENDURANCE]']": true,
                        "drop[objectId='map']": true
                    },
                    "healingExecuted": true,
                    "aletherUsed": false,
                    "soldObject": false,
                    "numberPickersState": {
                        "actionFired": null
                    }
                },
            // ...

            // Hunt is allowed in current book state?
            "huntEnabled": true,

            // States for special sections
            "otherStates": {
                "book6sect26TargetPoints": null,
                "book6sect284": null,
                "book6sect340": null,
                "book9sect91": null
            },

            // Global rules to apply on each section
            "globalRulesIds": []
        }
    },

    // State for previous played books. Only the Action Chart is stored. Key is the book number, and the value is 
    // the Action Chart object JSON (full documentation at actionChart.ts)
    "previousBooksState": {
        "11": "{\"combatSkill\":18,\"endurance\":26,\"currentEndurance\":28,\"weapons\":[\"sword\",\"bow\"],\"fightUnarmed\":false,\"selectedWeapon\":\"sword\",\"beltPouch\":14,\"meals\":3,\"backpackItems\":[\"rope\",\"lantern\",\"khetuspores\",\"baylonboughfungi\",\"silverflask\",\"silverflask\"],\"specialItems\":[\"quiver\",\"map\",\"quiver\"],\"hasBackpack\":true,\"disciplines\":[\"wpnmstry\",\"curing\",\"hntmstry\"],\"weaponSkill\":[\"bow\",\"sword\",\"dagger\",\"broadsword\"],\"annotations\":\"\",\"manualRandomTable\":true,\"extendedCRT\":false,\"yScrollPosition\":323.6363525390625,\"arrows\":9,\"adganaUsed\":false,\"restore20EPUsed\":false,\"kaiMonasterySafekeeping\":[],\"tags\": []}"
    }
}

```
