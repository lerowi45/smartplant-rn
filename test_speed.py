import requests, time

url = "http://localhost:5001/analyze"
image_path = r"C:\Users\Lemuel\Desktop\Work\smartplant-rn\test_leaf.jpg"  # put a real leaf image path here

results = []
for i in range(1, 11):
    with open(image_path, "rb") as f:
        start = time.time()
        r = requests.post(url, files={"image": f}, data={"crop_type": "general"})
        elapsed = (time.time() - start) * 1000
    results.append(round(elapsed, 1))
    print(f"Request {i}: {elapsed:.1f}ms — {r.json().get('source', 'unknown')}")

print(f"\nAverage: {sum(results)/len(results):.1f}ms")
print(f"Min: {min(results)}ms  Max: {max(results)}ms")