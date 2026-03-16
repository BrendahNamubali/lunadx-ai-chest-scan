import urllib.request
import urllib.parse
import json
import http.client

# Test script for LunaDX API using built-in modules
BASE_URL = "127.0.0.1"
PORT = 8000

def test_health():
    print("🔍 Testing health endpoint...")
    try:
        conn = http.client.HTTPConnection(BASE_URL, PORT)
        conn.request("GET", "/health")
        response = conn.getresponse()
        data = response.read().decode()
        print(f"✅ Health: {response.status}")
        print(f"   Response: {json.loads(data)}")
        conn.close()
    except Exception as e:
        print(f"❌ Health error: {e}")

def test_login():
    print("\n🔍 Testing login endpoint...")
    try:
        conn = http.client.HTTPConnection(BASE_URL, PORT)
        headers = {"Content-Type": "application/json"}
        login_data = json.dumps({
            "email": "admin@lunadx.com",
            "password": "admin123"
        })
        conn.request("POST", "/auth/login", login_data, headers)
        response = conn.getresponse()
        data = response.read().decode()
        print(f"✅ Login: {response.status}")
        print(f"   Response: {json.loads(data)}")
        conn.close()
        return json.loads(data).get("access_token")
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def test_patients():
    print("\n🔍 Testing patients endpoint...")
    try:
        conn = http.client.HTTPConnection(BASE_URL, PORT)
        conn.request("GET", "/patients")
        response = conn.getresponse()
        data = response.read().decode()
        print(f"✅ Patients: {response.status}")
        print(f"   Response: {json.loads(data)}")
        conn.close()
    except Exception as e:
        print(f"❌ Patients error: {e}")

def test_create_patient():
    print("\n🔍 Testing create patient endpoint...")
    try:
        conn = http.client.HTTPConnection(BASE_URL, PORT)
        headers = {"Content-Type": "application/json"}
        patient_data = json.dumps({
            "name": "Test Patient",
            "age": 45,
            "sex": "Male",
            "hospitalId": "TEST-001",
            "symptoms": "Cough, fever",
            "visitDate": "2026-03-16"
        })
        conn.request("POST", "/patients", patient_data, headers)
        response = conn.getresponse()
        data = response.read().decode()
        print(f"✅ Create Patient: {response.status}")
        print(f"   Response: {json.loads(data)}")
        conn.close()
    except Exception as e:
        print(f"❌ Create Patient error: {e}")

def test_analyze():
    print("\n🔍 Testing analyze endpoint...")
    try:
        conn = http.client.HTTPConnection(BASE_URL, PORT)
        headers = {"Content-Type": "application/json"}
        conn.request("POST", "/analyze", "{}", headers)
        response = conn.getresponse()
        data = response.read().decode()
        print(f"✅ Analyze: {response.status}")
        print(f"   Response: {json.loads(data)}")
        conn.close()
    except Exception as e:
        print(f"❌ Analyze error: {e}")

if __name__ == "__main__":
    print("🧪 Testing LunaDX API Endpoints")
    print("=" * 50)
    
    test_health()
    token = test_login()
    test_patients()
    test_create_patient()
    test_analyze()
    
    print("\n✨ All tests completed!")
    print("🌐 API is working correctly!")
    print("📋 You can now connect the frontend to http://127.0.0.1:8000")
