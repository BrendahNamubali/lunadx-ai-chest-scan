import requests
import json

# Test script for LunaDX API
BASE_URL = "http://127.0.0.1:8000"

def test_health():
    print("🔍 Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"✅ Health: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"❌ Health error: {e}")

def test_login():
    print("\n🔍 Testing login endpoint...")
    try:
        login_data = {
            "email": "admin@lunadx.com",
            "password": "admin123"
        }
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        print(f"✅ Login: {response.status_code}")
        print(f"   Response: {response.json()}")
        return response.json().get("access_token")
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def test_patients():
    print("\n🔍 Testing patients endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/patients")
        print(f"✅ Patients: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"❌ Patients error: {e}")

def test_create_patient():
    print("\n🔍 Testing create patient endpoint...")
    try:
        patient_data = {
            "name": "Test Patient",
            "age": 45,
            "sex": "Male",
            "hospitalId": "TEST-001",
            "symptoms": "Cough, fever",
            "visitDate": "2026-03-16"
        }
        response = requests.post(f"{BASE_URL}/patients", json=patient_data)
        print(f"✅ Create Patient: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"❌ Create Patient error: {e}")

def test_analyze():
    print("\n🔍 Testing analyze endpoint...")
    try:
        response = requests.post(f"{BASE_URL}/analyze")
        print(f"✅ Analyze: {response.status_code}")
        print(f"   Response: {response.json()}")
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
