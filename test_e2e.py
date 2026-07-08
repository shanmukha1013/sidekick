import httpx
import time
import uuid

API_URL = "http://localhost:8080/api/v1"

def test_flow():
    client = httpx.Client(follow_redirects=True)
    
    uid = str(uuid.uuid4())[:8]
    employer_user = f"emp_{uid}"
    worker_user = f"work_{uid}"
    pwd = "password123"

    print("1. Register Employer...")
    res = client.post(f"{API_URL}/auth/register", json={
        "username": employer_user,
        "password": pwd,
        "email": f"{employer_user}@test.com",
        "phone_number": "1234567890",
        "role": "EMPLOYER"
    })
    print(res.status_code, res.text)
    emp_token = res.json()["access_token"]
    
    print("2. Register Worker...")
    res = client.post(f"{API_URL}/auth/register", json={
        "username": worker_user,
        "password": pwd,
        "email": f"{worker_user}@test.com",
        "phone_number": "0987654321",
        "role": "WORKER"
    })
    print(res.status_code, res.text)
    work_token = res.json()["access_token"]
    
    emp_headers = {"Authorization": f"Bearer {emp_token}"}
    work_headers = {"Authorization": f"Bearer {work_token}"}
    
    print("3. Edit Employer Profile...")
    res = client.put(f"{API_URL}/profiles/me", headers=emp_headers, json={
        "bio": "A test employer",
        "location": "New York"
    })
    print(res.status_code, res.text)
    
    print("4. Post a Job...")
    res = client.post(f"{API_URL}/jobs", headers=emp_headers, json={
        "title": "Test E2E Job",
        "description": "This is an E2E test job.",
        "hourly_rate": 55.5,
        "job_type": "Freelance",
        "location_name": "New York",
        "is_remote": True
    })
    print(res.status_code, res.text)
    job_id = res.json()["id"]
    
    print("5. Explore Jobs...")
    res = client.get(f"{API_URL}/jobs")
    print(res.status_code, f"Jobs found: {len(res.json())}")
    
    print("6. Apply for Job as Worker...")
    res = client.post(f"{API_URL}/jobs/{job_id}/apply", headers=work_headers, json={
        "job_id": job_id,
        "cover_letter": "Hire me pls",
        "expected_salary": 50,
        "availability": "Immediately",
    })
    print(res.status_code, res.text)
    app_id = res.json()["id"]
    
    print("7. Employer check applications...")
    res = client.get(f"{API_URL}/jobs/applications/employer", headers=emp_headers)
    print(res.status_code, f"Apps found: {len(res.json())}")
    
    print("8. Employer accepts application...")
    res = client.put(f"{API_URL}/jobs/applications/{app_id}?status=accepted", headers=emp_headers)
    print(res.status_code, res.text)
    
    print("E2E Test Completed.")

if __name__ == "__main__":
    test_flow()
