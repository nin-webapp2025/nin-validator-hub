# ROBOST TECH API Documentation

GENERAL API KEY:
f76412ad0863337b5a1fab0b4d3334784ce5c0919e5e6cf72392aa539bb01020

---

## 1. Validation Service

### Endpoint
POST https://robosttech.com/api/validation

### Headers
- Content-Type: application/json
- api-key: <your_api_key>

### Body Example
{
  "nin": "18855414402"
}

### Sample Response
{
  "message": "Validation Submission Successfull",
  "approved": true,
  "category": "new",
  "success": true,
  "nin": "18855414402"
}

---

### Validation Status
POST https://robosttech.com/api/validation_status

Headers:
- Content-Type: application/json
- api-key: <your_api_key>

Body Example:
{
  "nin": "18855414402"
}

Sample Response:
{
  "message": "Uploaded",
  "status": "sent",
  "success": false,
  "in-progress": true
}

---

## 2. Clearance Service

### Endpoint
POST https://robosttech.com/api/clearance

### Headers
- Content-Type: application/json
- api-key: <your_api_key>

### Body Example
{
  "nin": "18855414402"
}

### Sample Response
{
  "message": "Clearance Submission Successfull",
  "approved": true,
  "success": true,
  "nin": "18855414402"
}

---

### Clearance Status
POST https://robosttech.com/api/clearance_status

Headers:
- Content-Type: application/json
- api-key: <your_api_key>

Body Example:
{
  "nin": "18855414402"
}

Sample Response:
{
  "message": "Clearance Status Successfull",
  "status": "completed",
  "success": true
}

---

## 3. NIN Search Service

### NIN Search
POST https://robosttech.com/api/nin_search

Headers:
- Content-Type: application/json
- api-key: <your_api_key>

Body Example:
{
  "nin": "18855414402"
}

Sample Response:
{
  "message": "NIN Search Successfull",
  "success": true,
  "data": {
    "nin": "18855414402",
    "firstName": "John",
    "lastName": "Doe"
  }
}

---

### NIN Phone Lookup
POST https://robosttech.com/api/nin_phone

Headers:
- Content-Type: application/json
- api-key: <your_api_key>

Body Example:
{
  "phone": "08012345678"
}

Sample Response:
{
  "message": "NIN Phone Lookup Successfull",
  "success": true,
  "nin": "18855414402"
}

---

### NIN Demo
POST https://robosttech.com/api/nin_demo

Headers:
- Content-Type: application/json
- api-key: <your_api_key>

Body Example:
{
  "nin": "12345678901"
}

Sample Response:
{
  "message": "Demo Successfull",
  "success": true,
  "nin": "12345678901"
}

---

## 4. Personalization Service

### Personalization
POST https://robosttech.com/api/personalization

Headers:
- Content-Type: application/json
- api-key: <your_api_key>

Body Example:
{
  "tracking_id": "CKW49TGENXXXXXX"
}

Sample Response:
{
  "message": "Personalization Submission Successfull",
  "approved": true,
  "category": "to_get_slip",
  "success": true,
  "tracking_id": "CKW49TGENXXXXXX"
}

---

### Personalization Status
POST https://robosttech.com/api/personalization_status

Headers:
- Content-Type: application/json
- api-key: <your_api_key>

Body Example:
{
  "tracking_id": "0SVF3F3SA7AZ30F"
}

Sample Response:
{
  "message": "Personalization Successfull",
  "personalized": true,
  "success": true,
  "status": "completed",
  "data": {
    "firstName": "AMILA",
    "middleName": null,
    "lastName": "ABDULLAHI",
    "dateOfBirth": "01-01-19XX",
    "gender": "FEMALE",
    "idNumber": "35XXXXXXXXX",
    "tracking_id": "XXXXXXXXX",
    "photo": "/9j/4AAQSkZJRgABAQEAYABgAAD//XXXXX",
    "firstname": "JAMILA",
    "surname": "ABDULLAHI",
    "middlename": "",
    "birthdate": "01-01-19XX",
    "residence_lga": "",
    "residence_state": "",
    "residence_AdressLine1": "",
    "residence_addr": "",
    "residence_address": "",
    "residence_Town": "",
    "self_origin_state": "",
    "self_origin_lga": "",
    "telephoneno": "",
    "email": "",
    "maritalstatus": "",
    "religion": "",
    "nin": "35XXXXXXXXX",
    "NIN": "35XXXXXXXXX",
    "birthcountry": "",
    "heigth": "170"
  },
  "reply": "Successfull"
}

# Prembly Verification API Documentation

---

## NIN Basic

### Endpoint
POST https://api.prembly.com/verification/vnin-basic

### Headers
{
  "accept": "application/json",
  "content-type": "application/json",
  "api-key": "your_api_key",
  "app-id": "your_app_id"
}

### Request Body
{
  "number": "12345678901"
}

### Example (cURL)
curl --request POST \
  --url https://api.prembly.com/verification/vnin-basic \
  --header 'accept: application/json' \
  --header 'content-type: application/json' \
  --header 'api-key: your_api_key' \
  --header 'app-id: your_app_id' \
  --data '{"number":"12345678901"}'

---

## NIN With Face

### Endpoint
POST https://api.prembly.com/verification/nin_w_face

### Headers
{
  "X-Api-Key": "{{API_KEY}}",
  "accept": "application/json",
  "app_id": "{{APP_ID}}",
  "content-type": "application/json"
}

### Request Body
{
  "image": "base64_encoded_image",
  "number_nin": 12345678901,
  "date_of_birth": "1990-01-01"
}

### Example (cURL)
curl --request POST \
  --url https://api.prembly.com/verification/nin_w_face \
  --header 'X-Api-Key: {{API_KEY}}' \
  --header 'accept: application/json' \
  --header 'app_id: {{APP_ID}}' \
  --header 'content-type: application/json' \
  --data '{"image":"base64_string","number_nin":12345678901,"date_of_birth":"1990-01-01"}'

---

## NIN Advance

### Endpoint
POST https://api.prembly.com/verification/nin_advance

### Headers
{
  "accept": "application/json",
  "content-type": "application/json",
  "api-key": "your_api_key",
  "app-id": "your_app_id"
}

### Request Body
{
  "number": "12345678901"
}

### Example (cURL)
curl --request POST \
  --url https://api.prembly.com/verification/nin_advance \
  --header 'accept: application/json' \
  --header 'content-type: application/json' \
  --header 'api-key: your_api_key' \
  --header 'app-id: your_app_id' \
  --data '{"number":"12345678901"}'

---

## BVN Basic

### Endpoint
POST https://api.prembly.com/verification/bvn_validation

### Headers
{
  "accept": "application/json",
  "content-type": "application/json",
  "x-api-key": "{{API_KEY}}"
}

### Request Body
{
  "number": "54651333604"
}

### Example (cURL)
curl --request POST \
  --url https://api.prembly.com/verification/bvn_validation \
  --header 'accept: application/json' \
  --header 'content-type: application/json' \
  --header 'x-api-key: {{API_KEY}}' \
  --data '{"number":"54651333604"}'

---

## BVN Advance

### Endpoint
POST https://api.prembly.com/verification/bvn

### Headers
{
  "accept": "application/json",
  "content-type": "application/json",
  "api-key": "your_api_key",
  "app-id": "your_app_id"
}

### Request Body
{
  "number": "54651333604"
}

### Example (cURL)
curl --request POST \
  --url https://api.prembly.com/verification/bvn \
  --header 'accept: application/json' \
  --header 'content-type: application/json' \
  --header 'api-key: your_api_key' \
  --header 'app-id: your_app_id' \
  --data '{"number":"54651333604"}'

---

## BVN + Face Validation

### Endpoint
POST https://api.prembly.com/verification/bvn_face

### Headers
{
  "accept": "application/json",
  "content-type": "application/json",
  "api-key": "your_api_key",
  "app-id": "your_app_id"
}

### Request Body
{
  "number": "54651333604",
  "image": "base64_encoded_image"
}

### Example (cURL)
curl --request POST \
  --url https://api.prembly.com/verification/bvn_face \
  --header 'accept: application/json' \
  --header 'content-type: application/json' \
  --header 'api-key: your_api_key' \
  --header 'app-id: your_app_id' \
  --data '{"number":"54651333604","image":"base64_string"}'

---

## CAC Advance

### Endpoint
POST https://api.prembly.com/verification/cac/advance

### Headers
{
  "accept": "application/json",
  "content-type": "application/json",
  "x-api-key": "{{API_KEY}}",
  "app-id": "{{APP_ID}}"
}

### Request Body
{
  "rc_number": "1377860",
  "company_type": "RC"
}

### Example (cURL)
curl --request POST \
  --url https://api.prembly.com/verification/cac/advance \
  --header 'accept: application/json' \
  --header 'content-type: application/json' \
  --header 'x-api-key: {{API_KEY}}' \
  --header 'app-id: {{APP_ID}}' \
  --data '{"rc_number":"1377860","company_type":"RC"}'

---

## Driver’s License Verification (Basic)

### Endpoint
POST https://api.prembly.com/verification/drivers_license

### Headers
{
  "accept": "application/json",
  "content-type": "application/json",
  "api-key": "your_api_key",
  "app-id": "your_app_id"
}

### Request Body
{
  "number": "DL1234567890"
}

### Example (cURL)
curl --request POST \
  --url https://api.prembly.com/verification/drivers_license \
  --header 'accept: application/json' \
  --header 'content-type: application/json' \
  --header 'api-key: your_api_key' \
  --header 'app-id: your_app_id' \
  --data '{"number":"DL1234567890"}'
