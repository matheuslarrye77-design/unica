# StorVi

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Appwrite](https://img.shields.io/badge/Appwrite-Backend-FD366E?style=for-the-badge&logo=appwrite&logoColor=white)

StorVi is a cloud storage web app for uploading, browsing, searching, sorting,
sharing and managing files. It uses Appwrite for authentication, database
records and file storage, while the frontend is built with Next.js, React,
Tailwind CSS and shadcn/Radix UI primitives.

## Tech Highlights

- **Frontend:** Next.js 16 App Router, React 19, TypeScript
- **Styling:** Tailwind CSS, shadcn-style components, Radix UI primitives
- **Backend:** Appwrite Auth, Databases and Storage
- **Forms and validation:** React Hook Form, Zod
- **File handling:** React Dropzone, Appwrite Storage, custom file-type helpers
- **Data visualization:** Recharts dashboard usage chart
- **UX:** Sonner toasts, responsive sidebar/mobile navigation, OTP auth flow

## What You Can Do

- Sign up and sign in with an email OTP flow.
- Upload files up to 50 MB from the header or mobile navigation.
- Browse files by category: Documents, Images, Media and Others.
- Search files by name.
- Sort files by date, name or size.
- Preview image thumbnails and file-type icons.
- Rename, view details, share, download and delete files from the action menu.
- See a dashboard with storage usage, category summaries and recently uploaded
  files.

## Tech Stack

| Area          | Tools                                                  |
| ------------- | ------------------------------------------------------ |
| Framework     | Next.js 16 App Router                                  |
| UI            | React 19, Radix UI, shadcn-style components            |
| Language      | TypeScript                                             |
| Styling       | Tailwind CSS, tailwind-merge, class-variance-authority |
| Backend       | Appwrite, node-appwrite                                |
| Auth          | Appwrite email OTP sessions with secure cookies        |
| Forms         | React Hook Form, Zod                                   |
| Uploads       | React Dropzone, Appwrite Storage                       |
| Charts        | Recharts                                               |
| Notifications | Sonner                                                 |

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` in the project root. You can use `.env.example` as a
template:

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT="https://fra.cloud.appwrite.io/v1"
NEXT_PUBLIC_APPWRITE_PROJECT_ID=""
NEXT_PUBLIC_APPWRITE_PROJECT_NAME=""
NEXT_PUBLIC_APPWRITE_DATABASE=""
NEXT_PUBLIC_APPWRITE_USERS_COLLECTION=""
NEXT_PUBLIC_APPWRITE_FILES_COLLECTION=""
NEXT_PUBLIC_APPWRITE_BUCKET=""
NEXT_APPWRITE_SECRET=""
```

### 3. Run the app locally

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Appwrite Setup

StorVi expects one Appwrite project with Auth, Database and Storage enabled.

### Environment Values

| Variable                                | Description                                                        |
| --------------------------------------- | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_APPWRITE_ENDPOINT`         | Appwrite endpoint, for example `https://fra.cloud.appwrite.io/v1`. |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID`       | Appwrite project ID.                                               |
| `NEXT_PUBLIC_APPWRITE_PROJECT_NAME`     | Project display name.                                              |
| `NEXT_PUBLIC_APPWRITE_DATABASE`         | Database ID.                                                       |
| `NEXT_PUBLIC_APPWRITE_USERS_COLLECTION` | Users collection ID.                                               |
| `NEXT_PUBLIC_APPWRITE_FILES_COLLECTION` | Files collection ID.                                               |
| `NEXT_PUBLIC_APPWRITE_BUCKET`           | Storage bucket ID.                                                 |
| `NEXT_APPWRITE_SECRET`                  | Server-side Appwrite API key. Never expose this in the browser.    |

### Suggested Collections

Users collection:

| Field       | Type   | Notes                                 |
| ----------- | ------ | ------------------------------------- |
| `fullName`  | string | User display name.                    |
| `email`     | string | User email address.                   |
| `avatar`    | string | Avatar image URL.                     |
| `accountId` | string | Appwrite account ID returned by Auth. |

Files collection:

| Field          | Type                | Notes                                                  |
| -------------- | ------------------- | ------------------------------------------------------ |
| `type`         | string              | One of `document`, `image`, `video`, `audio`, `other`. |
| `name`         | string              | File name.                                             |
| `url`          | string              | Public/view file URL.                                  |
| `extension`    | string              | File extension.                                        |
| `size`         | integer             | Original file size in bytes.                           |
| `owner`        | relationship/string | Owner user document.                                   |
| `users`        | string array        | Emails of users the file is shared with.               |
| `bucketFileId` | string              | Appwrite Storage file ID.                              |

Storage bucket:

- Allow uploads for authenticated users.
- Keep bucket permissions aligned with your Appwrite security model.
- The app stores metadata in the Files collection and the binary object in the
  Storage bucket.

## Available Scripts

| Command                | Description                               |
| ---------------------- | ----------------------------------------- |
| `npm run dev`          | Start the local development server.       |
| `npm run build`        | Build the production app.                 |
| `npm run start`        | Start the built app.                      |
| `npm run lint`         | Run ESLint.                               |
| `npm run format`       | Format the project with Prettier.         |
| `npm run format:check` | Check formatting without writing changes. |

## Project Structure

```text
app/
  (auth)/              Auth pages and auth layout
  (root)/              Protected app pages
  globals.css          Tailwind layers and app utility classes
components/
  ui/                  Reusable UI primitives
  ActionDropdown.tsx   File actions menu
  FileUploader.tsx     Drag-and-drop uploader
  DashboardChart.tsx   Storage usage chart
lib/
  actions/             Server actions for users and files
  appwrite/            Appwrite clients and config
  utils.ts             File, date, URL and dashboard helpers
constants/
  index.ts             Navigation, sort options and shared constants
types/
  index.d.ts           Shared global TypeScript types
public/assets/
  icons/               App icons and file-type icons
  images/              Auth and sidebar illustrations
```

## Main Routes

| Route        | Description                                    |
| ------------ | ---------------------------------------------- |
| `/sign-in`   | Sign in with email OTP.                        |
| `/sign-up`   | Create an account and verify with OTP.         |
| `/`          | Dashboard with storage usage and recent files. |
| `/documents` | Document files.                                |
| `/images`    | Image files.                                   |
| `/media`     | Video and audio files.                         |
| `/others`    | Files that do not match the known categories.  |

## Deployment Notes

The app is ready for Vercel deployment. Before deploying, add the same
environment variables from `.env.local` to Vercel Project Settings.

For Appwrite Cloud, also make sure your deployed domain is allowed in the
Appwrite project/platform settings. If images are served from a regional
Appwrite endpoint, keep that hostname in `next.config.ts` under
`images.remotePatterns`.

The project currently keeps Server Actions body size configured under
`experimental.serverActions.bodySizeLimit`, because this installed Next.js
version still reads the upload limit from that location.

## Useful Checks Before Shipping

```bash
npm run lint
npx tsc --noEmit
npm run build
```

These checks cover lint rules, TypeScript and the production build.

## Troubleshooting

### Vercel shows "This page couldn't load"

Check Vercel Function Logs first. The most common causes are missing Appwrite
environment variables or an Appwrite API key without enough permissions.

### Uploaded images do not render

Make sure the Appwrite hostname used by uploaded files is listed in
`next.config.ts` under `images.remotePatterns`.

### Hydration warning with `cz-shortcut-listen`

That attribute is usually injected by a browser extension, often a color picker
or shortcut extension. Test in an incognito window with extensions disabled.

### Upload fails for large files

The UI limit is `50 MB` (`MAX_FILE_SIZE` in `constants/index.ts`). The server
action body limit is configured as `100 MB` in `next.config.ts`.
