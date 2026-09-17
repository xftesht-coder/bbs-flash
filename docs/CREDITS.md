# Sources and acknowledgements / Источники и благодарности

## Bafang and Stefan Penov (Penoff)

BBS Flash is a browser adaptation built on the BafangConfigTool ecosystem. Its controller parameters, `.el` layout and BBS UART behavior are based on the original tool and its available source; they are not inventions of BBS Flash.

The bundled tool's `About.dfm` credits the original application to **Suzhou Bafang Electric Motor Science-Technology Co., LTD** and its improvements to **Stefan Penov (Penoff)**. Penoff published the improved application, source and a parameter guide:

- [E-bike conversion — software, Penoff](https://penoff.me/2016/01/13/e-bike-conversion-software/)
- [`assets/BBSTool.zip`](../assets/BBSTool.zip), retained from the repository's original materials: application, source, `Help.pdf` and `Source/Help.docx`.
- [Protocol references and independent implementations](PROTOCOL.md).

The RU/EN in-app field guide paraphrases Penoff's descriptions. It distinguishes original behavior descriptions from BBS Flash's own write policies and identifies uncertain firmware behavior. It does not reproduce the manual wholesale or imply that a simulator value is a hardware measurement. Consult the original manual and independently verify the firmware in use.

BBS Flash contributes the browser garage interface, local backup workflow, stricter validation and write checks, estimates, profile comparison and automated software tests. No affiliation with or endorsement by Bafang or Penoff is claimed. Original authorship and notices remain with their authors; this acknowledgement does not relicense the original application or source.

**По-русски:** BBS Flash опирается на BafangConfigTool, улучшенный Stefan Penov (Penoff). Его приложение, исходный код и справочник — основа работы с параметрами и форматом `.el`. Мы переработали это в браузерный инструмент с собственным интерфейсом, расчётами и проверками. Авторство исходной программы Bafang и вклад Penoff указаны в интерфейсе, справочнике и на главной странице.

## Visual assets

- **Russo One**, Jovanny Lemonad: self-hosted font from [Google Fonts](https://github.com/google/fonts/tree/main/ofl/russoone), SIL Open Font License 1.1. The original notice is in [`assets/OFL-RussoOne.txt`](../assets/OFL-RussoOne.txt).
- The bicycle, rider, landscape and instrument graphics are SVG/CSS drawn for BBS Flash. No artwork from a commercial game is included.
