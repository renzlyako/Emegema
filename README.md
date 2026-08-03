# EduSpace LMS

A private Learning Management System built with React + Vite + TailwindCSS + Supabase.

## Color Palette
- Background: `#F1F7ED`
- Dark Accent: `#243E36`
- Green Accent: `#7CA982`

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
Create a `.env` file in the root:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
Get these from: Supabase Dashboard → Your Project → Settings → API

### 3. Run the dev server
```bash
npm run dev
```

## Build Order (Pages to build next)
1. ✅ Landing Page (`/`)
2. ⬜ Login Page (`/login`)
3. ⬜ Register Page (`/register`)
4. ⬜ Student Dashboard (`/student/dashboard`)
5. ⬜ Teacher Dashboard (`/teacher/dashboard`)
6. ⬜ Course Pages
7. ⬜ Assignments
8. ⬜ Grading
9. ⬜ Admin Panel

## Folder Structure
```
src/
├── pages/
│   ├── LandingPage.jsx       ✅ Done
│   ├── auth/
│   │   ├── LoginPage.jsx     ⬜ Next
│   │   └── RegisterPage.jsx  ⬜ Next
│   ├── student/
│   └── teacher/
├── components/
│   ├── ui/
│   └── layout/
├── services/                 ⬜ Supabase calls
├── store/                    ⬜ Zustand stores
├── hooks/                    ⬜ Custom hooks
└── styles/
    └── index.css             ✅ Done
```
