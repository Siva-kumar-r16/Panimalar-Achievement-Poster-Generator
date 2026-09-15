# 🎓 Panimalar Achievement Poster Generator

A browser-based achievement poster generator for creating professional student and team achievement posters for
**Panimalar Engineering College**.

The application provides a live poster preview with customizable student information, achievement details, event
information, themes, photo positioning, and high-resolution PNG export.

## ✨ Features

- 🎨 Multiple poster themes
- 🏫 Panimalar Engineering College branding
- 📸 Student and team photo upload
- 🔍 Photo zoom and repositioning
- 👥 Support for 1–10 students
- 🏆 Achievement and prize selection
- 🎓 Academic year selection
- 💻 Department selection
- 🎤 Event and symposium details
- 📅 Event date configuration
- 🏛️ Organization and department details
- 💡 Random motivational phrases
- 🖼️ Live Canvas poster preview
- 💾 Photo persistence using IndexedDB
- ⚙️ Poster settings persistence using LocalStorage
- 🖨️ Browser-based printing
- 📥 High-resolution PNG export
- 4K export support
- 8K export support
- 📱 Responsive interface
- 🌐 Runs directly in a modern web browser
- 🚫 No backend server required

## 🛠️ Technology Stack

- HTML5
- CSS3
- Vanilla JavaScript
- HTML Canvas API
- IndexedDB
- LocalStorage
- Google Fonts

No frontend framework is required.

## 📁 Project Structure

```text
panimalar-achievement-poster/
│
├── index.html
├── style.css
├── script.js
│
├── images/
│   ├── logo.png
│   └── 26.png
│
├── README.md
├── LICENSE
├── CHANGELOG.md
├── CONTRIBUTING.md
└── SECURITY.md
```

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone YOUR_REPOSITORY_URL
```

### 2. Open the Project

```bash
cd panimalar-achievement-poster
```

### 3. Run the Website

This is a static website and does not require a backend server.

You can open:

```text
index.html
```

directly in a modern browser.

For development, using a local development server such as **VS Code Live Server** is recommended.

## 🖼️ Required Assets

The poster generator expects the following assets:

```text
images/logo.png
images/26.png
```

Make sure these files exist inside the `images` directory.

If the required assets are unavailable, the application displays a missing-assets warning.

## 🎨 Poster Themes

The generator supports:

* Maroon
* Royal Blue
* Crimson
* Purple
* Emerald
* Custom

The **Custom** theme allows the primary and secondary colors to be customized.

## 👥 Student Information

The generator supports up to **10 students**.

For each student, the user can enter their name.

The poster layout automatically adapts according to the selected number of students.

## 🏆 Achievement Options

Available achievement types include:

* 1st Prize
* 2nd Prize
* 3rd Prize
* Won
* Selected
* Custom Achievement
* Special Achievement

## 📸 Photo Management

Uploaded photos can be:

* Added to the poster
* Repositioned by dragging
* Zoomed
* Reset to the optimal position
* Removed

Uploaded photos can also be stored locally using **IndexedDB**, allowing them to remain available between browser
sessions.

## 💾 Data Storage

The application does not require a backend database.

### LocalStorage

LocalStorage is used to store poster settings such as:

* Theme
* Student information
* Academic year
* Department
* Achievement
* Event details
* Organization details
* Poster phrases
* Photo positioning

### IndexedDB

IndexedDB is used to store the uploaded student or team photo locally.

All storage happens inside the user's browser.

## 📤 PNG Export

The generated poster can be exported as a PNG image.

Supported export resolutions:

```text
4K → 2160 × 2700
8K → 4320 × 5400
```

The poster is rendered using the **HTML Canvas API** before export.

## 🖨️ Printing

The generated poster can be printed directly from the browser using the built-in print functionality.

## 🌐 Deployment

The project is completely static and can be deployed using:

* Cloudflare Pages
* GitHub Pages
* Netlify
* Vercel
* Any static web server

### Cloudflare Pages

The recommended Cloudflare Pages project name is:

```text
panimalar-poster-studio
```

Example deployment URL:

```text
https://panimalar-poster-studio.pages.dev
```

The actual URL depends on the Cloudflare Pages project configuration and availability.

## 🔒 Privacy

The application does not require user accounts or a backend server.

Uploaded photos and poster settings are stored locally in the user's browser.

Users should avoid uploading sensitive or confidential images.

## ⚡ Browser Support

The application requires a modern browser with support for:

* HTML Canvas
* IndexedDB
* LocalStorage
* File API
* ES6+ JavaScript

Recommended browsers:

* Google Chrome
* Microsoft Edge
* Mozilla Firefox
* Safari

## 📄 License

See [LICENSE](LICENSE) for licensing information.

## 📋 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## 🔐 Security

See [SECURITY.md](SECURITY.md) for security-related information.

---

## 🎓 Panimalar Engineering College

**Panimalar Achievement Poster Generator**

A digital poster creation tool for achievement announcements and institutional event communication.

```
