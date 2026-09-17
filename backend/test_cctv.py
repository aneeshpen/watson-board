import requests
import json

url = "http://127.0.0.1:8000/api/cctv/analyze"
with open("test_video.mp4", "rb") as f:
    files = {"file": ("test_cctv.mp4", f, "video/mp4")}
    r = requests.post(url, files=files, params={"interval": 1.0})

print(f"Status: {r.status_code}")
data = r.json()
print(f"Video Duration: {data['video_duration_seconds']}s")
print(f"FPS: {data['fps']}")
print(f"Frames Extracted: {data['total_frames_extracted']}")
print()
print("Frame-by-frame analysis:")
for frame in data["analysis"]:
    print(f"  [{frame['timestamp']}] {frame['description']}")

print()
print("--- Raw endpoint test ---")
url_raw = "http://127.0.0.1:8000/api/cctv/analyze/raw"
with open("test_video.mp4", "rb") as f:
    files = {"file": ("test_cctv.mp4", f, "video/mp4")}
    r2 = requests.post(url_raw, files=files, params={"interval": 1.0})

print(f"Status: {r2.status_code}")
print("Raw JSON output:")
print(json.dumps(r2.json(), indent=2))
