# 🤝 Contributing

Thank you for your interest in contributing to the Panimalar Achievement Poster Generator.

This repository is primarily maintained as a controlled project. Contributions should preserve the existing poster
generator functionality, visual design, and browser-based architecture.

## 📌 Project Structure

The project intentionally uses three main source files:

```text
index.html
style.css
script.js
```

The application is built using:

* HTML
* CSS
* Vanilla JavaScript
* HTML Canvas API
* IndexedDB
* LocalStorage

Do not introduce a frontend framework unless the project maintainer explicitly approves it.

## 🛠️ Development Guidelines

### HTML

Keep the existing HTML structure organized and semantic.

Do not remove or rename existing element IDs that are referenced by `script.js`.

When adding new elements, use meaningful IDs and classes.

### CSS

Keep styling inside:

```text
style.css
```

Avoid unnecessary inline styles.

Preserve the existing responsive design and poster editor layout.

### JavaScript

Keep application logic inside:

```text
script.js
```

Preserve the existing Canvas rendering
