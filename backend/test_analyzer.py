"""
Pregnancy test stick analyzer using OpenCV.

Pipeline:
1. Load image → grayscale
2. Edge detection → find contours → detect largest rectangle (test stick)
3. Perspective transform → crop stick
4. Find test window → scan for dark horizontal bands (C and T lines)
5. Measure intensity of each line
"""

import cv2
import numpy as np
import os
from PIL import Image


def analyze_test(image_path: str, output_dir: str, pre_cropped: bool = False) -> dict:
    """
    Analyze a pregnancy test photo.

    Returns dict with:
      success, cropped_filename, c_intensity, t_intensity, ratio
    """
    img = cv2.imread(image_path)
    if img is None:
        return {'success': False, 'error': 'Cannot read image'}

    os.makedirs(output_dir, exist_ok=True)

    if pre_cropped:
        # User already cropped — use original as-is (no re-encoding)
        cropped = img
        cropped_filename = os.path.basename(image_path)
        cropped_path = image_path
    else:
        # Try auto-detect the test stick
        cropped = _detect_and_crop_stick(img)

        if cropped is None:
            # Fallback: use center 80% of image
            h, w = img.shape[:2]
            margin_x, margin_y = int(w * 0.1), int(h * 0.1)
            cropped = img[margin_y:h - margin_y, margin_x:w - margin_x]

        # Ensure stick is oriented horizontally (wider than tall)
        h, w = cropped.shape[:2]
        if h > w:
            cropped = cv2.rotate(cropped, cv2.ROTATE_90_CLOCKWISE)

        # Save cropped image
        cropped_filename = 'cropped.jpg'
        cropped_path = os.path.join(output_dir, cropped_filename)
        cv2.imwrite(cropped_path, cropped)

    # Analyze lines
    result = _analyze_lines(cropped)
    result['cropped_filename'] = cropped_filename

    # Save annotated image for debugging/display
    annotated = _draw_annotations(cropped, result)
    annotated_filename = 'annotated.jpg'
    cv2.imwrite(os.path.join(output_dir, annotated_filename), annotated)
    result['annotated_filename'] = annotated_filename

    return result


def _detect_and_crop_stick(img):
    """Detect the test stick rectangle and crop it out."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Adaptive threshold to handle varying lighting
    thresh = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV, 21, 5
    )

    # Morphological close to fill gaps
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)

    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    img_area = img.shape[0] * img.shape[1]
    best_rect = None
    best_area = 0

    for cnt in contours:
        area = cv2.contourArea(cnt)
        # Filter: must be at least 5% of image, at most 95%
        if area < img_area * 0.05 or area > img_area * 0.95:
            continue

        # Approximate polygon
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.04 * peri, True)

        # Look for 4-sided shapes (rectangles)
        if len(approx) == 4 and area > best_area:
            best_area = area
            best_rect = approx

    if best_rect is None:
        # Fallback: use minimum area rectangle of largest contour
        largest = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(largest)
        if area < img_area * 0.05:
            return None
        rect = cv2.minAreaRect(largest)
        box = cv2.boxPoints(rect)
        best_rect = np.intp(box).reshape(4, 1, 2)

    # Perspective transform to get a straight rectangle
    return _four_point_transform(img, best_rect.reshape(4, 2))


def _four_point_transform(img, pts):
    """Apply perspective transform to straighten a quadrilateral."""
    # Order points: top-left, top-right, bottom-right, bottom-left
    rect = _order_points(pts.astype(np.float32))
    tl, tr, br, bl = rect

    width = int(max(np.linalg.norm(br - bl), np.linalg.norm(tr - tl)))
    height = int(max(np.linalg.norm(tr - br), np.linalg.norm(tl - bl)))

    if width == 0 or height == 0:
        return None

    dst = np.array([
        [0, 0], [width - 1, 0],
        [width - 1, height - 1], [0, height - 1]
    ], dtype=np.float32)

    M = cv2.getPerspectiveTransform(rect, dst)
    return cv2.warpPerspective(img, M, (width, height))


def _order_points(pts):
    """Order 4 points as: top-left, top-right, bottom-right, bottom-left."""
    rect = np.zeros((4, 2), dtype=np.float32)
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]   # top-left has smallest sum
    rect[2] = pts[np.argmax(s)]   # bottom-right has largest sum
    d = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(d)]   # top-right has smallest difference
    rect[3] = pts[np.argmax(d)]   # bottom-left has largest difference
    return rect


def _find_search_region(gray, color_img=None):
    """
    Find the search region between MAX line and HCG pad.

    The strip layout: [blank | MAX line | search region (C,T lines) | HCG pad]
    Within the region: C line (대조선) is LEFT, T line (검사선) is RIGHT.

    Returns (region_start, region_end) — a wide region that definitely contains C and T.
    Uses:
    - MAX line: darkest column in left half → region starts after MAX text
    - HCG pad: detected by high color saturation (pink/red, sat > 50)
    """
    h, w = gray.shape
    mid = gray[int(h * 0.25):int(h * 0.75), :]
    col_means = np.mean(mid, axis=0).astype(float)

    # Smooth
    k = max(5, w // 40)
    if k % 2 == 0:
        k += 1
    smoothed = np.convolve(col_means, np.ones(k) / k, mode='same')

    # Step 1: Find MAX line = darkest column in left half (skip edges)
    search_start = int(w * 0.05)
    search_end = int(w * 0.50)
    max_line_x = search_start
    darkest_val = smoothed[search_start]
    for i in range(search_start, search_end):
        if smoothed[i] < darkest_val:
            darkest_val = smoothed[i]
            max_line_x = i

    # Region starts well past MAX bar + "←MAX" text label
    # Use high threshold and require sustained brightness over a span
    peak_brightness = np.max(smoothed)
    bright_threshold = peak_brightness * 0.88
    check_span = max(15, w // 20)
    region_start = max_line_x
    for i in range(max_line_x, w - check_span):
        ahead = smoothed[i:i + check_span]
        if np.median(ahead) > bright_threshold:
            region_start = i
            break

    # Step 2: Find HCG pad start using color saturation (most reliable signal)
    # HCG pad has very high saturation (pink/red, sat > 60)
    # C/T lines have mild color (sat 20-35), so 60 avoids false triggers
    region_end = w - 1
    if color_img is not None:
        hsv = cv2.cvtColor(color_img, cv2.COLOR_BGR2HSV)
        sat_mid = hsv[int(h * 0.25):int(h * 0.75), :, 1].astype(float)
        col_sat = np.mean(sat_mid, axis=0)
        col_sat_smooth = np.convolve(col_sat, np.ones(k) / k, mode='same')

        for i in range(region_start + 20, w - check_span):
            ahead_sat = col_sat_smooth[i:i + check_span]
            if np.median(ahead_sat) > 60:
                region_end = i
                break

    # Small margin on left only (right side can have lines near HCG boundary)
    margin_left = max(3, (region_end - region_start) // 25)
    region_start = region_start + margin_left

    if region_end - region_start < 20:
        return int(w * 0.3), int(w * 0.70)

    return region_start, region_end


def _get_color_signal(cropped):
    """
    Extract a color-based signal that highlights pink/red lines.

    Uses HSV saturation + inverted green channel for maximum sensitivity
    to faint pink/red lines on a white background.
    Returns a single-channel numpy array (higher = more colored).
    """
    hsv = cv2.cvtColor(cropped, cv2.COLOR_BGR2HSV)
    sat = hsv[:, :, 1].astype(float)

    # Inverted green channel: pink/red lines have low green relative to red/blue
    g_inv = 255.0 - cropped[:, :, 1].astype(float)

    # Combine: saturation is the primary signal, green-inverse adds sensitivity
    signal = sat * 0.6 + g_inv * 0.4
    return signal


def _analyze_lines(cropped):
    """
    Analyze the cropped stick image to find C and T lines.

    Uses color (saturation + inverted green) instead of grayscale brightness
    for much better sensitivity to faint pink/red lines.

    1. Find the search region (between MAX and HCG pad)
    2. Scan columns for the two most colored vertical bands
    3. C line = rightmost (closer to HCG), T line = leftmost (closer to MAX)
    Returns color intensity scores (0~100): higher = more visible.
    """
    gray = cv2.cvtColor(cropped, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape

    # Step 1: Find search region (wide area between MAX and HCG pad)
    win_start, win_end = _find_search_region(gray, color_img=cropped)

    # Vertical focus: narrow center band
    y_start = int(h * 0.40)
    y_end = int(h * 0.60)

    # Color signal for line detection
    signal = _get_color_signal(cropped)
    window = signal[y_start:y_end, win_start:win_end]
    win_w = window.shape[1]

    if win_w < 10:
        return {
            'success': False,
            'error': 'Test window too small',
            'c_intensity': None, 't_intensity': None, 'ratio': None,
        }

    # Step 2: Background = low signal (white areas have near-zero saturation)
    bg_level = float(np.percentile(window, 10))

    # Column means within the test window
    col_means = np.mean(window, axis=0).astype(float)

    # Smooth (small kernel to preserve narrow line features)
    kernel_size = max(3, win_w // 50)
    if kernel_size % 2 == 0:
        kernel_size += 1
    smoothed = np.convolve(col_means, np.ones(kernel_size) / kernel_size, mode='same')

    # Color strength relative to background
    strength = smoothed - bg_level
    strength = np.clip(strength, 0, None)

    band_w = max(2, win_w // 40)

    def measure_strength(x):
        band = window[:, max(0, x - band_w):min(win_w, x + band_w)]
        if band.size == 0:
            return 0.0
        mean_val = float(np.mean(band))
        # Normalize to 0~100 scale (saturation range is 0~255)
        return max(0, (mean_val - bg_level) / max(1, 255 - bg_level) * 100)

    # Step 3: Find C line first (strongest colored band in right half)
    # Exclude rightmost 5% to avoid HCG pad boundary artifacts
    right_half_start = win_w // 2
    right_margin = max(5, win_w // 20)
    c_search_end = win_w - right_margin
    c_local_x = right_half_start + int(np.argmax(strength[right_half_start:c_search_end]))

    # Step 4: Find T line — search to the LEFT of C
    t_search_start = max(0, c_local_x - int(win_w * 0.40))
    t_search_end = max(0, c_local_x - int(win_w * 0.08))

    if t_search_end <= t_search_start:
        return {
            'success': False,
            'error': 'T search zone too small',
            'c_intensity': None, 't_intensity': None, 'ratio': None,
        }

    # Find the most colored point in the T search zone
    t_zone = strength[t_search_start:t_search_end]
    t_local_x = t_search_start + int(np.argmax(t_zone))

    c_strength = measure_strength(c_local_x)
    t_strength = measure_strength(t_local_x)

    # Convert local x back to full image x
    c_x = c_local_x + win_start
    t_x = t_local_x + win_start

    # Ratio: T/C (0 = T invisible, 1.0 = T as colored as C)
    if c_strength > 0.5:
        ratio = round(t_strength / c_strength, 3)
    else:
        ratio = 0.0

    return {
        'success': True,
        'bg_level': round(bg_level, 1),
        'c_intensity': round(c_strength, 1),
        't_intensity': round(t_strength, 1),
        'ratio': min(ratio, 2.0),
        'c_line_x': int(c_x),
        't_line_x': int(t_x),
        'window_y': (y_start, y_end),
        'window_x': (win_start, win_end),
    }


def recalculate_at_positions(cropped_img, c_x, t_x):
    """Recalculate intensity at user-specified C/T line positions using color signal."""
    h, w = cropped_img.shape[:2]
    y_start = int(h * 0.40)
    y_end = int(h * 0.60)

    signal = _get_color_signal(cropped_img)
    window = signal[y_start:y_end, :]
    win_w = window.shape[1]

    bg_level = float(np.percentile(window, 10))
    band_w = max(2, win_w // 40)

    def measure(x):
        band = window[:, max(0, x - band_w):min(win_w, x + band_w)]
        if band.size == 0:
            return 0.0
        mean_val = float(np.mean(band))
        return max(0, (mean_val - bg_level) / max(1, 255 - bg_level) * 100)

    c_intensity = round(measure(c_x), 1)
    t_intensity = round(measure(t_x), 1)
    ratio = round(t_intensity / c_intensity, 3) if c_intensity > 0.5 else 0.0
    ratio = min(ratio, 2.0)

    return {
        'c_intensity': c_intensity,
        't_intensity': t_intensity,
        'ratio': ratio,
        'c_line_x': int(c_x),
        't_line_x': int(t_x),
        'window_y': (y_start, y_end),
    }


def _find_peaks(data, min_distance=10):
    """Find local maxima in 1D array with minimum distance between peaks."""
    peaks = []
    n = len(data)
    for i in range(2, n - 2):
        # Check if local maximum (wider window for noise resistance)
        if data[i] >= data[i - 1] and data[i] >= data[i + 1] and data[i] > data[i - 2] and data[i] > data[i + 2]:
            # Must be above median + some threshold
            if data[i] > np.median(data) + np.std(data) * 0.2:
                peaks.append(i)

    # Filter by minimum distance (keep strongest)
    if not peaks:
        return []

    filtered = [peaks[0]]
    for p in peaks[1:]:
        if p - filtered[-1] >= min_distance:
            filtered.append(p)
        elif data[p] > data[filtered[-1]]:
            filtered[-1] = p

    return filtered


def _find_peaks_relaxed(data, min_distance=10):
    """Find peaks with very low threshold for faint lines."""
    peaks = []
    n = len(data)
    threshold = np.max(data) * 0.15  # just 15% of max darkness

    for i in range(2, n - 2):
        if data[i] >= data[i - 1] and data[i] >= data[i + 1] and data[i] > threshold:
            peaks.append(i)

    if not peaks:
        return []

    filtered = [peaks[0]]
    for p in peaks[1:]:
        if p - filtered[-1] >= min_distance:
            filtered.append(p)
        elif data[p] > data[filtered[-1]]:
            filtered[-1] = p

    return filtered


def _draw_annotations(cropped, result):
    """Draw line positions and intensity info on the image for visualization."""
    annotated = cropped.copy()
    h, w = annotated.shape[:2]

    if not result.get('success'):
        return annotated

    c_x = result.get('c_line_x', 0)
    t_x = result.get('t_line_x', 0)
    y_start, y_end = result.get('window_y', (0, h))
    win_x = result.get('window_x')

    # Draw test window boundary (green dashed rectangle)
    if win_x:
        cv2.rectangle(annotated, (win_x[0], y_start), (win_x[1], y_end),
                       (100, 200, 100), 1)

    # Draw C line marker (blue) - vertical line
    cv2.line(annotated, (c_x, y_start), (c_x, y_end), (255, 100, 100), 2)
    cv2.putText(annotated, 'C', (c_x - 5, max(y_start - 5, 12)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 100, 100), 2)

    # Draw T line marker (red/pink) - vertical line
    cv2.line(annotated, (t_x, y_start), (t_x, y_end), (100, 100, 255), 2)
    cv2.putText(annotated, 'T', (t_x - 5, max(y_start - 5, 12)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.4, (100, 100, 255), 2)

    return annotated
