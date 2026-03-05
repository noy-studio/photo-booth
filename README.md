# photo-booth

A 9-shot black-and-white **Film Photo Booth** web app with your film-frame style.

## Behavior

- Photos are placed directly into the 9 frame slots.
- While shooting, only the current slot shows a live preview.
- You can pause/resume during countdown via the button shown under the countdown number.
- All shots are black-and-white.
- Buttons use a solid dark-green style.
- **Undo Last Shot** removes only the latest shot (9th -> 8th -> 7th...).

## Run

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173` and use:

1. **Start Camera**
2. **Start 9 Shots**
3. **Pause / Resume** during capture if needed
4. **Undo Last Shot** if needed
5. **Save Result**

## iPhone save note

- Full automatic save to Photos app is restricted by browser policy.
- If share sheet appears, choose **Save Image**.
