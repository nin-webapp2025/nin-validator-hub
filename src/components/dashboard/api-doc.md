Data and Airtime API Documentation

API key: Store as the `SMARTAPI_API_KEY` Supabase Edge Function secret. Never place the value in this file or browser code.

Airtime Endpoint:
Error codes: 200 » success, 400 » pending, 800 » failed, 900 » reversed

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://sabuss.com/vtu/api/buy/{API_KEY}');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_POST, 1);
$post = array(
    'pin' => '{PRODUCTION_PIN}',
    'plan_id' => '1',
    'phone' => '08011223344',
    'amount' => 100,
    'reference' => ''
);
curl_setopt($ch, CURLOPT_POSTFIELDS, $post);
$result = json_decode(curl_exec($ch),true);
if (curl_errno($ch)) {
    echo 'Error:' . curl_error($ch);
}
curl_close($ch);
print_r($result);

Data Endpoint:
Error codes: 200 » success, 400 » pending, 800 » failed, 900 » reversed

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://sabuss.com/vtu/api/buy/{API_KEY}');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_POST, 1);
$post = array(
    'pin' => '{PRODUCTION_PIN}',
    'plan_id' => '1',
    'phone' => '08011223344',
    'reference' => ''
);
curl_setopt($ch, CURLOPT_POSTFIELDS, $post);
$result = json_decode(curl_exec($ch),true);
if (curl_errno($ch)) {
    echo 'Error:' . curl_error($ch);
}
curl_close($ch);
print_r($result);

Query/Fetch Transactions:
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://sabuss.com/vtu/api/query/{API_KEY}');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, array(
'pin' => '{PRODUCTION_PIN}',
'reference' => '1234567876543'
));
$result = json_decode(curl_exec($ch),true);
if (curl_errno($ch)) {
    echo 'Error:' . curl_error($ch);
}
curl_close($ch);
print_r($result);

List of plan IDs:
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://sabuss.com/vtu/api/plans/{API_KEY}');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_POST, 1);
$post = array(
    'pin' => '{PRODUCTION_PIN}',
    'category' => 'data', //airtime
);
curl_setopt($ch, CURLOPT_POSTFIELDS, $post);
$result = json_decode(curl_exec($ch),true);
if (curl_errno($ch)) {
    echo 'Error:' . curl_error($ch);
}
curl_close($ch);

// RESULTS 

foreach ($result as $plan) {
    echo $plan['plan_id'].' = '.$plan['name'].' = '.$plan['amount'].'<br>';
}



Sample Responses
SUCCESSFUL PURCHASE:
{
  "code": "400",
  "status": "pending",
  "product": "MTN SME 500MB",
  "response": "Your order is processed successfully to 08011223344. Update is sent to Webhook.",
  "reference": "202503120833KCBVI41"
}

WEBHOOK RESPONSE:
{
  "code":"900",
  "status":"reversed",
  "response":"This order has been reversed to your wallet.",
  "reference":"202503131008UHXLY15",
  "product":"MTN Airtime",
  "recipient":"08011223344",
  "amount":"50",
  "date":"Mar 13, 2025 10:08 AM"
}

Check API Balance:
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://sabuss.com/vtu/api/balance/{API_KEY}');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, array(
'pin' => '{PRODUCTION_PIN}'
));
$result = json_decode(curl_exec($ch),true);
if (curl_errno($ch)) {
    echo 'Error:' . curl_error($ch);
}
curl_close($ch);
print_r($result);



