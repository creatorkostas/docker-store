# Project Context: docker-store

## Overview
This is a **Next.js** web application (version 16.0.6) serving as a **Docker App Store**. It allows users to browse and download Docker Compose configurations from various sources (JSON lists or ZIP archives).
It features a **Shadcn UI** frontend and a backend API for managing sources and file operations.

## Key Technologies
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **UI Library:** React 19, Shadcn UI
- **Styling:** Tailwind CSS 4
- **Utilities:** `adm-zip` (Zip extraction), `uuid`

## Directory Structure
- `app/`:
  - `api/`: Backend API routes (`sources`, `apps`, `download`).
  - `app/[id]/`: App details page.
  - `page.tsx`: Main store interface.
- `components/`:
  - `source-manager.tsx`: Modal for adding/managing URL sources.
  - `store-interface.tsx`: Main grid view.
  - `app-details.tsx`: Details view with download actions.
- `lib/`:
  - `processor.ts`: Logic for downloading ZIPs and extracting `Apps/`.
  - `sources.ts`: CRUD for `data/sources.json`.
- `public/storage/`: Extracted assets from ZIP sources.
- `data/`: Persisted application data (`sources.json`).
- `server_downloads/`: Default target for "Download to Server" action (configurable via `.env`).

## Building and Running

### Prerequisites
- Node.js
- `.env` file with `SERVER_DOWNLOAD_PATH` (default provided).

### Commands
| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the development server at `http://localhost:3000`. |
| `npm run build` | Builds the application for production. |
| `npm run start` | Starts the production server. |

## Features
- **Source Management:** Support for JSON app lists and ZIP archives (extracts `Apps` folder).
- **Persistence:** Sources are saved in `data/sources.json`.
- **Download Options:**
  - Client-side download of `docker-compose.yml`.
  - Server-side save to configured directory.
- **Refresh:** Re-download and re-process ZIP sources on demand.
- **Filtering:** Filter apps by source or search by name.
- **Auto-Description:** Automatically populates app description from `README.md` file in the app folder.
- **Screenshots:** Displays screenshots (named `screenshot-<number>.png`) from the app folder in the details view.
- **Editor:** Built-in editor to customize `docker-compose.yml` with two modes:
  - **Easy Setup:** Comprehensive UI form to configure Image, Container Name, Restart Policy, Privileged Mode, Volumes, Ports, and Environment Variables.
  - **Raw YAML:** Full text editor for advanced customization.
- **Yacht Template Support:** Fully compatible with Yacht JSON templates, automatically converting them to Docker Compose configurations.
- **CasaOS App Support:** Automatically processes CasaOS app ZIPs (checked via toggle), extracting metadata, cleaning `x-casaos` extensions, and normalizing volume definitions to standard short syntax for compatibility.
- **Source Management:** Add, remove, and edit sources (JSON or ZIP). Toggle Yacht or CasaOS processing modes for existing sources.
- **Settings:** Configure default values for Yacht template variables (e.g., `!PUID`, `!config`) via a dedicated settings page.
- **Authentication:** User login via GitHub OAuth. Guest users can browse and download locally, while logged-in users can save to server and manage sources/settings.
  - **Debug Mode:** If `DEBUG=true` is set in `.env`, a "Debug Login" option allows bypassing OAuth for testing.
- **App Deduplication:** Groups identical apps from different sources in the main view, allowing users to select the preferred source on the details page.
