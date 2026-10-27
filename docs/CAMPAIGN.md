# Sentence Foundry campaign

27 October 2026. Forty-five authored contracts form a finite nine-chapter campaign. Each contract is a construction puzzle whose English specification changes receiver, final properties, action roles, dependency order or rework. Counts range from one to four; no chapter is produced by multiplying a short recipe across random counts. There are 45 distinct normalized receiver/agent/graph/final-state requirements, plus explicit paraphrase practice.

| Chapter | Levels | Name | Progression |
|---|---|---|---|
| 1 | 1–5 | המשמרת הראשונה | מחברים קו, מזהים מי פועל ומה מקבל את הפעולה, ומתקנים את המשלוח הראשון. |
| 2 | 6–10 | הלקוח מתכוון בדיוק | אותן מכונות, דרישות שונות: חפץ נכון, תווית במקום נכון ותכונה שצריכה להישאר חסרה. |
| 3 | 11–15 | חדר הייבוש | מייבשים חומר וקובעים צבע. ייבוש לפני צביעה אינו ייבוש של הצבע שאחריה. |
| 4 | 16–20 | עוקבים אחרי החומר | כינויי גוף וסדר פעולות מלווים את אותו מוצר דרך קווים ארוכים יותר. |
| 5 | 21–25 | סדנה קטנה, חוזה גדול | בונים קווים קומפקטיים ומבחינים בין סדר הכרחי לבין שתי פעולות שיכולות להתחלף. |
| 6 | 26–30 | פותחים שוב | תחנת הפתיחה מאפשרת להגיע לתוכן האריזה. תווית חיצונית נזרקת; תווית פנימית נשמרת. |
| 7 | 31–35 | משמרת התיקונים | פותחים, מתקנים ומרכיבים מחדש משלוחים בלי לאבד את זהות מקבל הפעולה. |
| 8 | 36–40 | קו הביקורת | מבצעים תהליכי בדיקה בני כמה שלבים, עם פעולות חוזרות ודרישות שליליות מדויקות. |
| 9 | 41–45 | המשלוח לתערוכה | חמש הזמנות גמר משלבות את כל הכלים עד למשלוח שנושא תווית פנימית וחיצונית. |

## Construction and unlocks

Levels 1–5 preserve the original slice and exact layout IDs 0–4. Levels 6–10 refine specifications using the original four machines. The dryer unlocks at level 11; the unpacker unlocks at level 26. Palettes contain only unlocked machines and include legitimate distractors. Dual-source layouts 2/6 use crates and service arms; panels use single-source layouts. Layout variants do not replace semantic differences.

Contracts contain one to eight required operation stages. The root builds routes separately from the semantic graph; the test-only literal recipes in tests/campaign-fixtures.ts are never imported by the game. Four compact contracts have a real 11-piece budget on layouts 0/1, whose shortest route uses nine cells. Unused placed parts count too. All other lines retain room for multiple layouts.

## Rework and state

Drying sets dried and cures an existing coat. A new wash or coat clears drying/curing. Opening a package changes accessibility and discards its outside label; the optional itemLabelled state remembers an inner tag under an outside tag. Ineffective drying on a sealed item and ineffective unpacking of an already-open item cannot witness required process stages.

The later campaign includes temporary wrapper tags, preserved inner IDs, stripped trial coats, reopened inspection packages, replacement labels and a final package with two paper layers. Three partial-order contracts accept both dry→label and label→dry. More machines are not automatically better: a final unwashed, unpainted, uncured or unlabelled requirement can make an extra operation wrong.

## Authored reference plans

This is developer/teacher solution information, not a player HUD.

| Level | ID | Layout | Count | Piece cap | One independently authored valid operation order |
|---|---|---|---|---|---|
| 1 | first-shipment | 0 | 1 | — | wash |
| 2 | same-work-new-focus | 1 | 2 | — | wash → paint |
| 3 | receiver-switch | 2 | 1 | — | paint |
| 4 | sequence-and-reference | 3 | 3 | — | wash → paint → label → pack |
| 5 | new-workshop | 4 | 3 | — | wash → pack → label |
| 6 | clean-identities | 1 | 2 | — | wash → label |
| 7 | plain-protection | 5 | 3 | — | wash → pack |
| 8 | tag-the-unit | 6 | 1 | — | wash → label |
| 9 | blue-nameplates | 8 | 2 | — | paint → label |
| 10 | wrapped-blue-order | 0 | 3 | — | paint → pack → label |
| 11 | dry-wood | 1 | 2 | — | wash → dry |
| 12 | cured-panels | 5 | 3 | — | wash → paint → dry |
| 13 | wet-coat-demonstration | 8 | 1 | — | wash → dry → paint |
| 14 | dry-service-return | 6 | 2 | — | wash → dry |
| 15 | two-drying-stages | 7 | 2 | — | wash → dry → paint → dry |
| 16 | cure-before-paper | 3 | 3 | — | wash → paint → dry → label → pack |
| 17 | paper-removal-test | 5 | 2 | — | label → wash → dry → label |
| 18 | arm-cure-and-tag | 2 | 2 | — | wash → paint → dry → label |
| 19 | strip-the-trial-coat | 8 | 2 | — | paint → wash → dry → pack |
| 20 | outside-after-curing | 7 | 4 | — | wash → paint → dry → pack → label |
| 21 | compact-clear-panel | 0 | 3 | 11 | wash → dry → pack → label |
| 22 | compact-cured-crates | 1 | 3 | 11 | wash → paint → dry → label → pack |
| 23 | either-after-paint | 6 | 2 | — | wash → paint → dry → label → pack |
| 24 | two-jobs-before-sealing | 1 | 2 | 11 | wash → dry → label → pack |
| 25 | compact-wet-finish | 0 | 2 | 11 | wash → dry → paint → label → pack |
| 26 | open-for-tagging | 5 | 2 | — | pack → unpack → label |
| 27 | open-before-paint | 8 | 2 | — | wash → pack → unpack → paint |
| 28 | keep-the-inner-id | 6 | 2 | — | wash → label → pack → unpack |
| 29 | replace-the-wrapper-tag | 3 | 3 | — | pack → label → unpack → label |
| 30 | return-to-clean-material | 7 | 3 | — | pack → label → unpack → wash → dry → pack |
| 31 | replace-the-faulty-coat | 8 | 2 | — | wash → paint → pack → unpack → wash → paint → dry → label |
| 32 | inside-id-outside-dispatch | 5 | 3 | — | label → pack → label → unpack → pack → label |
| 33 | serial-tag-after-inspection | 2 | 2 | — | wash → paint → dry → pack → unpack → label → pack |
| 34 | open-the-unwashed-sample | 7 | 1 | — | pack → label → unpack → paint → dry → pack |
| 35 | cure-then-strip | 3 | 3 | — | wash → paint → dry → wash → dry → label → pack |
| 36 | open-and-retag | 8 | 2 | — | wash → paint → dry → label → pack → unpack → label |
| 37 | cover-the-fit-label | 5 | 2 | — | wash → label → pack → unpack → paint → dry → pack → label |
| 38 | pressure-check-panels | 7 | 3 | — | pack → unpack → wash → dry → paint → dry → pack → label |
| 39 | repair-the-tagged-unit | 6 | 2 | — | wash → pack → label → unpack → paint → dry → label → pack |
| 40 | inspection-keeps-the-label | 3 | 4 | — | wash → paint → dry → label → pack → unpack → pack |
| 41 | exhibition-crate-relabel | 8 | 3 | — | wash → paint → dry → pack → label → unpack → label → pack |
| 42 | exhibition-bare-panels | 7 | 3 | — | dry → paint → wash → dry → label → pack → unpack → pack |
| 43 | exhibition-preserve-the-id | 6 | 2 | — | wash → paint → dry → label → pack → label → unpack → pack |
| 44 | exhibition-returned-shipment | 5 | 4 | — | pack → label → unpack → wash → paint → dry → pack → label |
| 45 | foundry-exhibition-finale | 8 | 3 | — | wash → paint → dry → label → pack → unpack → pack → label |

## Ending

The final order is an exhibition shipment of service arms. The coat must be cleanly bonded and cured, the item ID must survive an inspection opening, and a dispatch tag must be attached outside the final package. Drying and attaching the item ID may swap, so the finale still respects its English rather than demanding an arbitrary total order.

Completion text: **המשלוח לתערוכה יצא לדרך!** כל 45 ההזמנות הושלמו. הקווים שבניתם שלחו את המוצרים לתערוכת ההמצאות. אפשר לחזור לכל פרק ולנסות מסלול קומפקטי יותר.

The ending records actual completion of 45 orders, not English mastery. The root UI owns the final completion state, chapter selection and saved progress; it should not silently restart level 1 when the last shipment arrives. Players can explicitly revisit chapters and improve their routes.

## Verification scope

Content validation checks 45 unique IDs/texts, nine ordered groups of five, layout bounds/receiver compatibility, counts, stage bounds, machine unlocks and availability, named actors, paraphrase equivalence and piece budgets. Independent semantic tests check physical truth and counterexamples. Separate root route/simulation/browser tests establish actual construction paths and the finite completion UI.

Final verification on 27 October 2026: the independent semantics/content suites passed 35 checks, including all 45 literal plans and the separate physical oracle. Root integration reported 54 pure checks passing, all 45 contracts completed through actual browser UI, saved-progress reload and finale reload passing, eight-tool mobile controls passing, the 14-buffer audio regression passing, and six warmed resource cycles without accumulation. Browser and rendering evidence is maintained by the root reviewer separately from the content oracle.
