"""Manually crop 10 strips from multi-strip photo, upscale, analyze."""
import cv2
import numpy as np
import os
import uuid
import sqlite3
from datetime import datetime
from test_analyzer import analyze_test

def main():
    img = cv2.imread('/data/uploads/_tests/7f231245/original.jpg')
    if img is None:
        print("ERROR: Cannot read image")
        return

    img = cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
    h, w = img.shape[:2]
    print(f"Image: {h}x{w}")

    hcg_centers = [873, 1081, 1214, 1367, 1532, 1684, 1861, 1995, 2123, 2230]
    dates = [
        '2026-03-03', '2026-03-02', '2026-03-01', '2026-02-28',
        '2026-02-27', '2026-02-26', '2026-02-25', '2026-02-24',
        '2026-02-23', '2026-02-22',
    ]

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Find body centers (brightest column in test area for each strip)
    test_band = gray[400:800, :]
    body_centers = []
    for cx in hcg_centers:
        x1, x2 = max(0, cx - 60), min(w, cx + 60)
        col_means = np.mean(test_band[:, x1:x2], axis=0)
        body_centers.append(x1 + int(np.argmax(col_means)))

    # Full strip Y range (including HCG for proper analysis)
    y_start = 50
    y_end = 1900

    for i, (bcx, hcg_cx, date) in enumerate(zip(body_centers, hcg_centers, dates)):
        # Use the wider of (body center, hcg center) as the reference
        # Crop width: ±35px from center (70px total, just the strip body)
        center_x = bcx
        half_w = 35
        x1 = max(0, center_x - half_w)
        x2 = min(w, center_x + half_w)

        crop = img[y_start:y_end, x1:x2].copy()
        ch, cw = crop.shape[:2]

        # Aggressive white-out of edges (8px each side)
        edge = 8
        crop[:, :edge] = [255, 255, 255]
        crop[:, -edge:] = [255, 255, 255]

        # Rotate 90 CCW: MAX goes left, HCG goes right
        horizontal = cv2.rotate(crop, cv2.ROTATE_90_COUNTERCLOCKWISE)

        # Upscale 5x with bicubic interpolation
        hh, hw = horizontal.shape[:2]
        scale = 5
        upscaled = cv2.resize(horizontal, (hw * scale, hh * scale),
                              interpolation=cv2.INTER_CUBIC)

        # Light Gaussian blur to smooth noise
        upscaled = cv2.GaussianBlur(upscaled, (3, 3), 0)

        print(f"Strip {i+1} ({date}): body_cx={bcx}, "
              f"crop={ch}x{cw}, horiz={hh}x{hw}, upscaled={upscaled.shape[0]}x{upscaled.shape[1]}")

        # Save as original and let analyze_test handle it
        test_id = str(uuid.uuid4())[:8]
        test_dir = os.path.join('/data/uploads/_tests', test_id)
        os.makedirs(test_dir, exist_ok=True)

        original_path = os.path.join(test_dir, 'original.jpg')
        cv2.imwrite(original_path, upscaled)

        # Run standard analyzer
        result = analyze_test(original_path, test_dir)

        c_val = result.get('c_intensity')
        t_val = result.get('t_intensity')
        ratio = result.get('ratio')
        print(f"  success={result.get('success')}, C={c_val}, T={t_val}, ratio={ratio}")

        # DB
        conn = sqlite3.connect('/data/journal.db')
        cur = conn.cursor()
        cur.execute(
            'INSERT INTO test_analyses(user_id, date, original_path, cropped_path, '
            'c_intensity, t_intensity, ratio, created_at) VALUES(?,?,?,?,?,?,?,?)',
            (1, date,
             f'_tests/{test_id}/original.jpg',
             f'_tests/{test_id}/{result.get("cropped_filename", "")}' if result.get('success') else '',
             c_val, t_val, ratio,
             datetime.utcnow().isoformat())
        )
        conn.commit()
        conn.close()

    print("\nAll done!")


if __name__ == '__main__':
    main()
