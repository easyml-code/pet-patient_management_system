import requests
import sys
import uuid
from datetime import datetime

class ClinicAPITester:
    def __init__(self, base_url="https://medbooking-pro.preview.emergentagent.com"):
        self.base_url = base_url
        self.supabase_url = "https://txkstsbkajncqvngpsqr.supabase.co"
        self.supabase_service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4a3N0c2JrYWpuY3F2bmdwc3FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTA3Nzg4MiwiZXhwIjoyMDg2NjUzODgyfQ.5uNM1tkFI-kNB6b5hTn1kt65tVwv0m0wXWcjboaq7pc"
        self.token = None
        self.test_user_id = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                if response.content:
                    try:
                        response_data = response.json()
                        print(f"   Response keys: {list(response_data.keys()) if isinstance(response_data, dict) else 'Non-dict response'}")
                    except:
                        print(f"   Response: {response.text[:200]}")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response.content:
                    try:
                        error_data = response.json()
                        print(f"   Error: {error_data}")
                    except:
                        print(f"   Error: {response.text[:200]}")

            return success, response.json() if response.content and success else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def create_supabase_test_user(self):
        """Create a test user using Supabase admin API"""
        test_email = f"test_{uuid.uuid4().hex[:8]}@clinic.com"
        test_password = "TestPass123!"
        
        print(f"\n🔧 Creating Supabase test user: {test_email}")
        
        try:
            # Create user via Supabase admin API
            response = requests.post(
                f"{self.supabase_url}/auth/v1/admin/users",
                headers={
                    'Authorization': f'Bearer {self.supabase_service_key}',
                    'Content-Type': 'application/json',
                    'apikey': self.supabase_service_key
                },
                json={
                    'email': test_email,
                    'password': test_password,
                    'email_confirm': True,
                    'user_metadata': {'full_name': 'Test Doctor'}
                }
            )
            
            if response.status_code in [200, 201]:
                user_data = response.json()
                self.test_user_id = user_data['id']
                print(f"✅ Created test user with ID: {self.test_user_id}")
                
                # Now sign in to get access token
                sign_in_response = requests.post(
                    f"{self.supabase_url}/auth/v1/token?grant_type=password",
                    headers={'Content-Type': 'application/json', 'apikey': self.supabase_service_key},
                    json={'email': test_email, 'password': test_password}
                )
                
                if sign_in_response.status_code == 200:
                    token_data = sign_in_response.json()
                    self.token = token_data['access_token']
                    print(f"✅ Got access token for test user")
                    return True, test_email
                else:
                    print(f"❌ Failed to get access token: {sign_in_response.status_code}")
                    return False, None
            else:
                print(f"❌ Failed to create user: {response.status_code} - {response.text}")
                return False, None
                
        except Exception as e:
            print(f"❌ Error creating test user: {str(e)}")
            return False, None

    def cleanup_test_user(self):
        """Clean up test user"""
        if self.test_user_id:
            try:
                response = requests.delete(
                    f"{self.supabase_url}/auth/v1/admin/users/{self.test_user_id}",
                    headers={
                        'Authorization': f'Bearer {self.supabase_service_key}',
                        'apikey': self.supabase_service_key
                    }
                )
                if response.status_code == 200:
                    print(f"✅ Cleaned up test user: {self.test_user_id}")
                else:
                    print(f"⚠️  Could not clean up test user: {response.status_code}")
            except Exception as e:
                print(f"⚠️  Error cleaning up test user: {str(e)}")

    def test_health_endpoint(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )
        return success

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API Info",
            "GET", 
            "api",
            200
        )
        return success

    def test_setup_clinic(self, clinic_name="Test Clinic", clinic_type="human_clinic"):
        """Test clinic setup endpoint"""
        success, response = self.run_test(
            "Setup Clinic",
            "POST",
            "api/auth/setup-clinic",
            200,
            data={"clinic_name": clinic_name, "clinic_type": clinic_type}
        )
        return success, response

    def test_get_me(self):
        """Test get current user endpoint"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "api/auth/me",
            200
        )
        return success, response

    def test_crud_endpoints(self):
        """Test CRUD endpoints"""
        endpoints = [
            ("GET", "api/doctors", 200, "Get Doctors"),
            ("GET", "api/patients", 200, "Get Patients"),
            ("GET", "api/services", 200, "Get Services"),
            ("GET", "api/staff", 200, "Get Staff"),
        ]
        
        results = []
        for method, endpoint, expected_status, name in endpoints:
            success, response = self.run_test(name, method, endpoint, expected_status)
            results.append(success)
        
        return results

def main():
    # Setup
    tester = ClinicAPITester()
    
    print("🚀 Starting Comprehensive Backend API Tests for Zap AI Clinic Platform")
    print(f"Testing against: {tester.base_url}")
    
    # Run basic API tests first
    print("\n=== BASIC API TESTS ===")
    tester.test_health_endpoint()
    tester.test_root_endpoint()

    # Create test user and get token
    print("\n=== AUTHENTICATION TESTS ===")
    user_created, test_email = tester.create_supabase_test_user()
    
    if not user_created:
        print("❌ Could not create test user, skipping auth tests")
        print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
        return 1

    try:
        # Test clinic setup
        setup_success, setup_response = tester.test_setup_clinic()
        
        if setup_success:
            # Test get current user
            me_success, me_response = tester.test_get_me()
            
            if me_success:
                # Test CRUD endpoints
                print("\n=== CRUD ENDPOINTS TESTS ===")
                crud_results = tester.test_crud_endpoints()
                
                print(f"\n📊 CRUD endpoints passed: {sum(crud_results)}/{len(crud_results)}")
        
    finally:
        # Cleanup
        print("\n=== CLEANUP ===")
        tester.cleanup_test_user()

    # Print final results
    print(f"\n📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All backend tests passed!")
        return 0
    else:
        print("⚠️  Some backend tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())