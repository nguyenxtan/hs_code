# Local source and prepared data

Download the four files listed in `scripts/sources.json` from the [owner-provided folder](https://drive.google.com/drive/folders/1jEN1kzB0qVbjA7UH7Zm49WAZ5XdHR1A7) to `data/raw/2026-11-03/`, preserving their names. Files must match the pinned SHA-256 values. No service credentials or temporary download URLs belong in Git.

Run `npm run data:prepare` to validate and create `data/processed/2026-11-03/`. Optional `manifest.json` is validated when present; the committed source registry always checks all four expected files. No original SQL script is executed by preparation.

Raw and prepared files are intentionally gitignored. The data source declares CC BY-SA 4.0. Preserve attribution **HS Knowledge Base — github.com/ozvietnam/hs-code-api**, license links and changes if distributing a derivative. Do not apply the repository's MIT license to external data. Do not add third-party WCO content without checking rights.

The XLSX `HS_2022` sheet is reconciled exactly to JSON/CSV; `CH98_BoSung` supplies 457 separate records. Raw values are retained, including empty VAT cells and three missing corresponding codes.
