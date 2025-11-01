# Aurora Test OS

Aurora Test OS is a lightweight, browser-based environment for experimenting with virtual storage workflows. It simulates drives, file operations, stress tests, and note taking inside a premium, Apple-inspired interface.

## Features

- **Virtual drive lab** – create, clone, delete, and wipe simulated drives with configurable capacities.
- **File operations** – add or remove files on each drive while tracking used vs. free space with live progress indicators.
- **Stress testing** – auto-generate sequential writes to fill a drive and observe how capacity changes.
- **Activity logging** – every drive keeps a timestamped log of actions for quick auditing.
- **System monitor** – see aggregated drive counts, capacity, usage, and free space at a glance.
- **Persistent notes** – capture observations for each session with a built-in notebook.
- **Dock shortcuts** – quick access to create drives, launch stress tests, or open notes.

## Getting started

1. Open `index.html` in a modern browser.
2. Create a drive from the Storage Lab panel.
3. Inspect the drive to add files, launch stress tests, or review the activity log.
4. Use the Dock to trigger frequent actions and the Notes panel to document findings.

All data is stored locally in your browser via `localStorage`, so no backend services are required.
